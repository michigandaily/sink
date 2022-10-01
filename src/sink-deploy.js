import { fileURLToPath } from "node:url";
import { readdirSync, lstatSync, createReadStream } from "node:fs";
import { join, extname, dirname } from "node:path";
import { createHash } from "node:crypto";

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
} from "@aws-sdk/client-cloudfront";
import { fromIni } from "@aws-sdk/credential-providers";
import { lookup } from "mime-types";
import { load_config, success } from "./_utils.js";

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

const main = async ([platform], opts) => {
  const { config } = await load_config(opts.config);
  if (platform === "aws") {
    const { region, bucket, key, build, profile } = config.deployment;

    const credentials = fromIni({ profile });
    const client = new S3Client({ region, credentials });
    const list = new ListObjectsCommand({ Bucket: bucket, Prefix: key });
    const response = await client.send(list);

    const parent = join(build);
    const directory = readDirectory(build);

    const uploadFiles = (files) => {
      files.forEach(async (file) => {
        const k = join(key, file.replace(parent, ""));
        const stream = createReadStream(file);
        const put = new PutObjectCommand({
          Bucket: bucket,
          Key: k,
          Body: stream,
          ContentType: lookup(extname(file)) || "application/octet-stream",
        });
        const res = await client.send(put);
        const status = res.$metadata.httpStatusCode;
        const log = status === 200 ? success : console.log;
        log(`status ${status} - uploaded ${k}`);
      });
    };

    if (Object.hasOwn(response, "Contents")) {
      const content = response.Contents.filter((d) => !d.Key.endsWith("/"));
      if (content.length === 0) {
        uploadFiles(directory);
      } else {
        const filesToDelete = Array();
        const filesToReplace = new Set();
        const filesToAdd = Array();

        const remote = new Map(content.map(({ Key, ETag }) => [Key, ETag]));
        const local = new Map(
          await Promise.all(
            directory.map(async (file) => {
              const Key = join(key, file.replace(parent, ""));
              const ETag = await getFileETag(file);
              return [Key, ETag];
            })
          )
        );

        for (const [key, etag] of remote.entries()) {
          if (!local.has(key)) {
            filesToDelete.push(key);
          } else if (local.get(key) !== etag) {
            filesToDelete.push(key);

            const f = key.startsWith("/") ? key : `/${key}`;
            const d = `${dirname(f)}/*`;
            filesToReplace.add(d);
          }
        }

        for (const [key, etag] of local.entries()) {
          if (!remote.has(key)) {
            filesToAdd.push(key);
          } else if (remote.get(key) !== etag) {
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

        filesToAdd.forEach(async (file) => {
          const fp = join(parent, file.replace(key, ""));
          const stream = createReadStream(fp);
          const upload = new PutObjectCommand({
            Bucket: bucket,
            Key: file,
            Body: stream,
            ContentType: lookup(extname(file)) || "application/octet-stream",
          });
          const res = await client.send(upload);
          const status = res.$metadata.httpStatusCode;
          const log = status === 200 ? success : console.log;
          log(`status ${status} - uploaded ${file}`);
        });

        if (filesToReplace.size > 0) {
          const { distribution } = config.deployment;

          const cloudfront = new CloudFrontClient({ region, credentials });
          const invalidate = new CreateInvalidationCommand({
            DistributionId: distribution,
            InvalidationBatch: {
              CallerReference: new Date().toISOString(),
              Paths: {
                Quantity: filesToReplace.size,
                Items: Array.from(filesToReplace),
              },
            },
          });
          const res = await cloudfront.send(invalidate);
          const status = res.$metadata.httpStatusCode;
          const log = status === 201 ? success : console.log;
          log(`status ${status} - invalidated ${Array.from(filesToReplace)}`);
        }
      }
    } else {
      console.log(`Creating new directory ${key} in ${bucket}.`);
      uploadFiles(directory);
    }
  }
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.1.1")
    .addArgument(
      new Argument("<platform>", "platform to deploy to").choices(["aws"])
    )
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.args, program.opts());
}
