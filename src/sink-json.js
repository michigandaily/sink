import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { program } from "commander";
import { drive } from "@googleapis/drive";

import { load_config, success, get_auth } from "./_utils.js";

export const fetchJson = async ({ id, output, auth }) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];
  const authObject = get_auth(auth, scopes);

  const gdrive = drive({ version: "v3", auth: authObject });

  const { data } = await gdrive.files.get({ fileId: id, alt: "media" });

  const dir = output.substring(0, output.lastIndexOf("/"));
  !existsSync(dir.length > 0 ? dir : ".") &&
    mkdirSync(dir, { recursive: true });
  writeFileSync(output, JSON.stringify(data));
  success(`Wrote output to ${output}`);
};

const main = async (opts) => {
  const { config } = await load_config(opts.config);
  const files = config.fetch.filter(
    (d) => d.type === "json" && d.id.length && d.output.length
  );
  files.forEach(fetchJson);
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("1.3.0")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
