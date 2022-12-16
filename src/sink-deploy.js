import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readdirSync, lstatSync, createReadStream } from "node:fs";
import { join, extname, dirname, normalize } from "node:path";
import { createHash } from "node:crypto";

import { program, Argument } from "commander";
import chalk from "chalk";
import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { fromIni } from "@aws-sdk/credential-providers";
import { lookup } from "mime-types";
import { load_config, success } from "./_utils.js";

const self = fileURLToPath(import.meta.url);

const readDirectory = (directory) => {
  const files = Array();
  const dir = readdirSync(directory);
  dir.forEach((file) => {
    const path = join(directory, file);
    if (lstatSync(path).isDirectory()) {
      files.push(...readDirectory(path));
    } else {
      files.push(path);
    }
  });
  return files;
};

const getFileETag = async (file) => {
  const stream = createReadStream(file);
  const hash = createHash("md5");
  return await new Promise((res) => {
    stream.on("data", (data) => {
      hash.update(data, "utf8");
    });

    stream.on("end", () => {
      res(`"${hash.digest("hex")}"`);
    });
  });
};

const createInvalidationPath = (fp) => {
  const dir = dirname(fp);
  return dir === "." ? `/*` : `/${dir}/*`;
};

const depth = (directory) => directory.split("/").length - 1;

const main = async ([platform], opts) => {
  const { config } = await load_config(opts.config);
  if (platform === "aws") {
    execSync("yarn build", { stdio: "inherit" });

    const { region, bucket, key, build, profile } = config.deployment;

    const credentials = fromIni({ profile });
    const client = new S3Client({ region, credentials });
    const list = new ListObjectsCommand({ Bucket: bucket, Prefix: key });
    const response = await client.send(list);

    const parent = join(build);
    const directory = readDirectory(build);

    const uploadFile = async (Bucket, Key, file) => {
      const stream = createReadStream(file);
      const put = new PutObjectCommand({
        Bucket,
        Key,
        Body: stream,
        ContentType: lookup(extname(file)) || "application/octet-stream",
      });
      const res = await client.send(put);
      const status = res.$metadata.httpStatusCode;
      const log = status === 200 ? success : console.log;
      log(`status ${status} - uploaded ${Key}`);
    };

    const uploadFiles = async (files) => {
      for await (const file of files) {
        let k = join(key, file.replace(parent, ""));
        if (k.startsWith("/")) {
          k = k.substring(1);
        }
        await uploadFile(bucket, k, file);
      }
    };

    if (Object.hasOwn(response, "Contents")) {
      const content = response.Contents.filter(
        (d) => !d.Key.endsWith("/")
      ).sort((a, b) => depth(a.Key) - depth(b.Key));
      if (content.length === 0) {
        await uploadFiles(directory);
      } else {
        const filesToDelete = Array();
        const filesToInvalidate = new Set();
        const filesToAdd = Array();

        const remote = new Map(content.map(({ Key, ETag }) => [Key, ETag]));
        const local = new Map(
          await Promise.all(
            directory.map(async (file) => {
              let Key = join(key, file.replace(parent, ""));
              if (Key.startsWith("/")) {
                Key = Key.substring(1);
              }
              const ETag = await getFileETag(file);
              return [Key, ETag];
            })
          )
        );

        for (const [key, etag] of remote.entries()) {
          if (!local.has(key) || local.get(key) !== etag) {
            filesToDelete.push(key);
            const d = createInvalidationPath(key);
            if (!filesToInvalidate.has(d)) {
              const setContainsParent = Array.from(filesToInvalidate).some(
                (f) => {
                  const parent = f.substring(0, f.length - 1);
                  return d.startsWith(parent);
                }
              );

              if (!setContainsParent) {
                filesToInvalidate.add(d);
              }
            }
          }
        }

        for (const [key, etag] of local.entries()) {
          if (!remote.has(key) || remote.get(key) !== etag) {
            filesToAdd.push(key);
          } else if (remote.get(key) === etag) {
            console.log(
              `skipping ${key} - local and remote ETags are identical`
            );
          }
        }

        if (filesToDelete.length > 0) {
          const remove = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: filesToDelete.map((f) => ({ Key: f })),
            },
          });

          const res = await client.send(remove);
          filesToDelete.forEach((f) => {
            const status = res.$metadata.httpStatusCode;
            const log = status === 200 ? success : console.log;
            log(`status ${status} - deleted ${f}`);
          });
        }

        for await (const file of filesToAdd) {
          const fp = join(parent, file.replace(key, ""));
          await uploadFile(bucket, file, fp);
        }

        if (filesToInvalidate.size > 0) {
          const { distribution } = config.deployment;

          if (distribution === undefined || !distribution) {
            console.log("CloudFront distribution was not specified.");
            return;
          }

          const wildcards = Array.from(filesToInvalidate).filter((d) =>
            d.endsWith("*")
          );

          // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html#InvalidationLimits
          if (wildcards.length > 15) {
            filesToInvalidate.clear();
            filesToInvalidate.add("/*");
          }

          const cloudfront = new CloudFrontClient({ region, credentials });
          const invalidate = new CreateInvalidationCommand({
            DistributionId: distribution,
            InvalidationBatch: {
              CallerReference: new Date().toISOString(),
              Paths: {
                Quantity: filesToInvalidate.size,
                Items: Array.from(filesToInvalidate),
              },
            },
          });
          const res = await cloudfront.send(invalidate);
          const status = res.$metadata.httpStatusCode;
          const log = status === 201 ? success : console.log;
          log(
            `status ${status} - invalidated ${Array.from(filesToInvalidate)}`
          );
        }
      }
    } else {
      if (key.length > 0) {
        console.log(`Creating new directory ${key} in ${bucket}.`);
      }
      await uploadFiles(directory);
    }
  } else if (platform === "github") {
    const { url, build } = config.deployment;

    const deploy = join(dirname(self), "scripts", "deploy.sh");
    execSync(`sh ${deploy} ${normalize(build)}`, { stdio: "inherit" });

    const repository = execSync("basename -s .git `git remote get-url origin`")
      .toString()
      .trim();
    const regex = /https:\/\/(.*)\.github\.io/g;
    const organization = regex.exec(url)[1];
    console.log(
      "🔐 Remember to enforce HTTPS in the repository settings at",
      chalk.yellow(
        `https://github.com/${organization}/${repository}/settings/pages`
      )
    );
    console.log(
      "🍪 After enforcement, your graphic will be deployed at",
      chalk.cyan(url)
    );
  }
};

if (process.argv[1] === self) {
  program
    .version("2.5.1")
    .addArgument(
      new Argument("<platform>", "platform to deploy to").choices([
        "aws",
        "github",
      ])
    )
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.args, program.opts());
}
