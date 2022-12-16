#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { extname, join } from "node:path";

import { program } from "commander";
import { sheets } from "@googleapis/sheets";
import { csvFormat, tsvFormat } from "d3-dsv";

import {
  load_config,
  success,
  get_auth,
  write_file,
  has_filled_props,
  fatal_error,
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

export const fetchSheets = async ({ id, sheetId, output, auth, extension }) => {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const authObject = get_auth(auth, scopes);

  const sheet = sheets({ version: "v4", auth: authObject });

  let sheetQ;
  try {
    sheetQ = await sheet.spreadsheets.getByDataFilter({
      spreadsheetId: id,
      fields: "sheets(properties(title))",
      requestBody: sheetId === undefined ? undefined : { dataFilters: [{ gridRange: { sheetId: sheetId } }] }
    });
  } catch (e) {
    fatal_error(`
    Error when fetching sheet with spreadsheetId ${id}${sheetId === undefined ? "" : ` and sheetId ${sheetId}`}. Check the file identifer or your file access permissions.
    ${e.stack}
    `)
  }

  const ranges = sheetQ.data.sheets.map(sheet => `'${sheet.properties.title}'`);

  if (sheetId === undefined) {
    const nameQ = await sheet.spreadsheets.values.batchGet({
      spreadsheetId: id,
      ranges
    });

    nameQ.data.valueRanges.forEach(({ range, values }) => {
      const [r] = range.split("!");
      const title = r.replaceAll("'", "");
      const filePath = join(output, `${title}${extension ?? ".csv"}`);

      const file = parse({ data: { values } }, extension ?? ".csv");
      write_file(filePath, file);
      success(`Wrote output to ${filePath}`);
    });
  } else {
    const nameQ = await sheet.spreadsheets.values.get({
      spreadsheetId: id,
      range: ranges[0]
    });

    const file = parse(nameQ, extname(output));
    write_file(output, file);
    success(`Wrote output to ${output}`);
  }
};

async function main(opts) {
  const { config } = await load_config(opts.config);
  config.fetch
    ?.filter((d) => d.type === "sheet" && has_filled_props(d))
    .forEach(fetchSheets);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.5.1")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
