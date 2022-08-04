import { fetchDoc } from "./sink-gdoc";
import { fetchSheet } from "./sink-gsheet";
import { load_config } from "./_utils";

const main = async (opts) => {
  const { config } = await load_config(opts.config);
  config.fetch.forEach((file) => {
    const func = file.sheetId == null ? fetchDoc : fetchSheet;
    func(file);
  });
};

program
  .version("1.0.0")
  .option("-c, --config <path>", "path to config file")
  .parse();

main(program.opts());
