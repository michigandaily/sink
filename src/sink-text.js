import { fileURLToPath } from "node:url";

import { program } from "commander";
import { drive } from "@googleapis/drive";

import {
  load_config,
  success,
  get_auth,
  write_file,
  has_filled_props,
} from "./_utils.js";

export const fetchText = async ({ id, output, auth }) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];
  const authObject = get_auth(auth, scopes);

  const gdrive = drive({ version: "v3", auth: authObject });

  const { data } = await gdrive.files.get({ fileId: id, alt: "media" });

  write_file(output, data);
  success(`Wrote output to ${output}`);
};

const main = async (opts) => {
  const { config } = await load_config(opts.config);
  config.fetch
    ?.filter((d) => d.type === "text" && has_filled_props(d))
    .forEach(fetchText);
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.4.0")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
