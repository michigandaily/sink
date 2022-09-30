import { fileURLToPath } from "node:url";

import { program } from "commander";

import { fetchDoc } from "./sink-gdoc.js";
import { fetchSheet } from "./sink-gsheet.js";
import { fetchJson } from "./sink-json.js";
import { fetchCsv } from "./sink-csv.js";
import { load_config, fatal_error } from "./_utils.js";

const main = async (opts) => {
  const typeToFunction = {
    doc: fetchDoc,
    sheet: fetchSheet,
    json: fetchJson,
    csv: fetchCsv,
  };

  const { config } = await load_config(opts.config);
  config.fetch
    ?.filter((d) => d.id.length && d.output.length)
    .forEach((file) => {
      const func = typeToFunction[file.type];
      if (typeof func !== "function") {
        fatal_error(
          `Unsupported file type ${file.type} encountered when attempting to fetch ${file.id}`
        );
      }
      func(file);
    });
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.1.1")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
