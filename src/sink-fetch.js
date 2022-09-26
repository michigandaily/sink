import { fileURLToPath } from "node:url";

import { program } from "commander/esm.mjs";

import { fetchDoc } from "./sink-gdoc.js";
import { fetchSheet } from "./sink-gsheet.js";
import { fetchJson } from "./sink-json.js";
import { load_config } from "./_utils.js";

const main = async (opts) => {
  const typeToFunction = {
    doc: fetchDoc,
    sheet: fetchSheet,
    json: fetchJson,
  };

  const { config } = await load_config(opts.config);
  config.fetch
    .filter((d) => d.id.length && d.output.length)
    .forEach((file) => {
      const func = typeToFunction(file.type);
      func(file);
    });
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("1.3.0")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
