#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { extname } from "node:path";

import { program } from "commander";
import { sheets } from "@googleapis/sheets";
import { csvFormat, tsvFormat } from "d3-dsv";

import {
  load_config,
  success,
  get_auth,
  write_file,
  has_filled_props,
} from "./_utils.js";

const parse = ({ data: { values } }, extension) => {
  const data = Array();

  const headers = values.shift().map((h) => h.trim());
  const headerToValue = (d, i) => [headers[i], d];
  values.forEach((row) => {
    data.push(Object.fromEntries(row.map(headerToValue)));
  });

  if (extension === ".json") {
    return JSON.stringify(data);
  } else if (extension === ".tsv") {
    return tsvFormat(data, headers);
  } else {
    return csvFormat(data, headers);
  }
};

export const fetchSheet = async ({ id, sheetId, output, auth }) => {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const authObject = get_auth(auth, scopes);

  const sheet = sheets({ version: "v4", auth: authObject });
  const gidQ = await sheet.spreadsheets.getByDataFilter({
    spreadsheetId: id,
    fields: "sheets(properties(title))",
    requestBody: { dataFilters: [{ gridRange: { sheetId: sheetId } }] },
  });

  const nameQ = await sheet.spreadsheets.values.get({
    spreadsheetId: id,
    range: `'${gidQ.data.sheets.pop().properties.title}'`,
  });

  const file = parse(nameQ, extname(output));

  write_file(output, file);
  success(`Wrote output to ${output}`);
};

async function main(opts) {
  const { config } = await load_config(opts.config);
  config.fetch
    ?.filter((d) => d.type === "sheet" && has_filled_props(d))
    .forEach(fetchSheet);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.3.1")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
