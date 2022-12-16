import { fileURLToPath } from "node:url";

import { program } from "commander";

import { fetchDoc } from "./sink-gdoc.js";
import { fetchSheets } from "./sink-gsheet.js";
import { fetchJson } from "./sink-json.js";
import { fetchText } from "./sink-text.js";
import { load_config, fatal_error, has_filled_props } from "./_utils.js";

const main = async (opts) => {
  const typeToFunction = {
    doc: fetchDoc,
    sheet: fetchSheets,
    json: fetchJson,
    text: fetchText,
  };

  const { config } = await load_config(opts.config);
  config.fetch
    ?.filter((d) => has_filled_props(d))
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
    .version("2.5.1")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
