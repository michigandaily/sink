import { fileURLToPath } from "node:url";
import { readdirSync, lstatSync, createReadStream } from "node:fs";
import { join } from "node:path";

import { program, Argument } from "commander";
import {
  S3Client,
  // HeadObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
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

const main = async ([platform], opts) => {
  const { config } = await load_config(opts.config);
  if (platform === "aws") {
    const { region, bucket, key, build, profile } = config.deployment;

    const client = new S3Client({ region, credentials: fromIni({ profile }) });
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
        });
        const res = await client.send(put);
        const status = res.$metadata.httpStatusCode;
        const display = status === 200 ? success : console.log;
        display(`status ${status} - ${join(bucket, k)}`);
      });
    };

    if (Object.hasOwn(response, "Contents")) {
      const content = response.Contents.slice(1);
      if (content.length === 0) {
        uploadFiles(directory);
      } else {
        // reconcile which things to keep, delete, add.
        // invalidate cloudfront cache
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
