import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readdirSync, lstatSync, createReadStream, existsSync } from "node:fs";
import { extname, dirname, posix } from "node:path";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { exit } from "node:process";

import { program, Argument } from "commander";
import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  ListDistributionsCommand,
} from "@aws-sdk/client-cloudfront";
import { fromIni, fromEnv } from "@aws-sdk/credential-providers";
import { lookup } from "mime-types";

import { load_config, success, fatal_error } from "./_utils.js";

const self = fileURLToPath(import.meta.url);

const readDirectory = (directory) => {
  const files = Array();
  const dir = readdirSync(directory);
  dir.forEach((file) => {
    const path = posix.join(directory, file);
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

const getCommonStartingSubsequence = (strings) => {
  let sorted = strings.sort();
  let first = sorted.at(0);
  let last = sorted.at(-1);

  let length = first.length;
  let index = 0;

  while (index < length && first[index] === last[index]) {
    index++;
  }

  return first.substring(0, index);
};

const getPackageManager = () => {
  if (existsSync("yarn.lock")) {
    return "yarn";
  } else if (existsSync("pnpm-lock.yaml") || existsSync("pnpm-lock.yml")) {
    return "pnpm";
  } else {
    return "npm";
  }
};

const main = async ([platform], opts) => {
  const { config } = await load_config(opts.config);

  const shouldBuild = opts.skipBuild === undefined;
  const manualPrompt = opts.yes === undefined;

  if (platform === "aws") {
    const { region, bucket, key, build, profile } = config.deployment;

    if (region === null || region === undefined) {
      console.error("no AWS region was specified. exiting.");
      exit(1);
    }

    if (bucket === null || bucket === undefined) {
      console.error("no AWS bucket was specified. exiting.");
      exit(1);
    }

    if (build === null || build === undefined) {
      console.error("no build directory was specified. exiting.");
      exit(1);
    }

    let credentials;

    if (profile) {
      credentials = fromIni({ profile });
    } else {
      console.log(
        "no AWS credentials profile was specified. falling back to environment variables."
      );
      await import("dotenv/config");

      if (
        !!process.env.AWS_ACCESS_KEY_ID &&
        !!process.env.AWS_SECRET_ACCESS_KEY
      ) {
        credentials = fromEnv();
      } else {
        console.error(
          "no AWS credentials were specified in the environment variables. exiting."
        );
        exit(1);
      }
    }

    if (
      manualPrompt &&
      (key === undefined || key === null || key.length === 0)
    ) {
      const prompt = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await new Promise((res, rej) => {
        prompt.question(
          "Are you sure you want to deploy to the bucket root? [Y/n] ",
          (confirm) => {
            prompt.close();
            if (confirm === "Y") {
              res();
            } else {
              rej();
              fatal_error("Deployment cancelled");
            }
          }
        );
      });
    }

    if (key?.startsWith("/") || key?.endsWith("/")) {
      console.error("the `key` should not begin or end with '/'. exiting.");
      exit(1);
    }

    if (shouldBuild) {
      const packageManager = getPackageManager();
      execSync(`${packageManager} run build`, { stdio: "inherit" });
    } else {
      console.log("skipping build step");
    }

    const client = new S3Client({ region, credentials });
    const list = new ListObjectsCommand({ Bucket: bucket, Prefix: key });
    const response = await client.send(list);

    const parent = posix.join(build);
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
        let k = posix.join(key, file.replace(parent, ""));
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
              let Key = posix.join(key, file.replace(parent, ""));
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
          const status = res.$metadata.httpStatusCode;
          const log = status === 200 ? success : console.log;
          filesToDelete.forEach((f) => {
            log(`status ${status} - deleted ${f}`);
          });
        }

        for await (const file of filesToAdd) {
          const fp = posix.join(parent, file.replace(key, ""));
          await uploadFile(bucket, file, fp);
        }

        if (filesToInvalidate.size > 0) {
          let { distribution } = config.deployment;

          if (
            distribution === false ||
            distribution === "" ||
            distribution === null
          ) {
            console.log("skipping CloudFront invalidation");
            return;
          }

          const cloudfront = new CloudFrontClient({ region, credentials });

          if (distribution === undefined) {
            let res = await cloudfront.send(new ListDistributionsCommand({}));
            distribution = res.DistributionList.Items.find(
              ({ Aliases: { Quantity, Items } }) =>
                Quantity > 0 && Items.includes(bucket)
            )?.Id;

            while (
              distribution === undefined &&
              res.DistributionList.IsTruncated
            ) {
              res = await cloudfront.send(
                new ListDistributionsCommand({
                  Marker: res.DistributionList.NextMarker,
                })
              );
              distribution = res.DistributionList.Items.find(
                ({ Aliases: { Quantity, Items } }) =>
                  Quantity > 0 && Items.includes(bucket)
              )?.Id;
            }

            if (distribution === undefined) {
              console.log("could not find distribution for", bucket);
              console.log("skipping CloudFront invalidation");
              return;
            } else {
              console.log("found distribution", distribution, "for", bucket);
            }
          }

          const wildcards = Array.from(filesToInvalidate).filter((d) =>
            d.endsWith("*")
          );

          // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html#InvalidationLimits
          if (wildcards.length > 15) {
            const commonStartingPath = getCommonStartingSubsequence(
              Array.from(filesToInvalidate)
            );
            filesToInvalidate.clear();
            filesToInvalidate.add(`${commonStartingPath}*`);
          }

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
        console.log(`Creating new directory ${key} in ${bucket}`);
      }
      await uploadFiles(directory);
    }
  }
};

if (process.argv[1] === self) {
  program
    .version("3.0.1")
    .addArgument(
      new Argument("<platform>", "platform to deploy to").choices(["aws"])
    )
    .option("-s, --skip-build", "skip build step")
    .option("-c, --config <path>", "path to config file")
    .option("-y, --yes", "answer yes to prompts")
    .parse();

  main(program.args, program.opts());
}
