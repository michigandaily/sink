import { fileURLToPath } from "node:url";

import { program } from "commander";
import { load_config, success, get_auth, write_file } from "./_utils.js";

const main = async (opts) => {
  const { config } = await load_config(opts.config);
  const { bucket, key, build, profile } = config.deployment;
  console.log(bucket, key, build, profile);
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.1.1")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
