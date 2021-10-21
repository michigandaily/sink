#!/usr/bin/env node

import { load_config, fatal_error, success } from "./_utils.js";
import { program } from "commander/esm.mjs";
import { google } from "googleapis";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { csvFormat } from "d3-dsv";

const parse = (res) => {
  const csv = Array();

  const data = res.data.values;
  const headers = data.shift().map((h) => h.trim());

  const headerToValue = (d, i) => [headers[i], d];

  data.forEach((row) => {
    csv.push(Object.fromEntries(row.map(headerToValue)));
  });

  return csvFormat(csv, headers);
};

async function main(opts) {
  const { config } = await load_config(opts.config);

  const spreadsheetId = config.fetch.sheets.id;
  const sheetId = config.fetch.sheets.sheetId;
  const output = config.fetch.sheets.output;
  const keyFile = config.fetch.sheets.auth;

  if (!existsSync(keyFile)) {
    fatal_error(`
  Could not open service account credentials at ${keyFile}.
  Reconfigure fetch.sheets.auth in config.json or download the credentials file.
  `);
  }

  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const auth = new google.auth.GoogleAuth({keyFile, scopes})

  const sheet = google.sheets({ version: "v4", auth });
  const gidQ = await sheet.spreadsheets.getByDataFilter({
    spreadsheetId: spreadsheetId,
    fields: "sheets(properties(title))",
    requestBody: { dataFilters: [{ gridRange: { sheetId: sheetId } }] },
  });

  const nameQ = await sheet.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: `'${gidQ.data.sheets.pop().properties.title}'`,
  });

  const csv = parse(nameQ);

  const dir = output.substring(0, output.lastIndexOf("/"));
  !existsSync(dir) && mkdirSync(dir, { recursive: true });
  writeFileSync(output, csv);
  success(`Wrote output to ${output}`)
}

program.version("1.0.0")
  .option("-c, --config <path>", "path to config file")
  .parse();

main(program.opts());
