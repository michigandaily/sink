#!/usr/bin/env node

import { program } from "commander/esm.mjs";

program
  .version("1.3.0")
  .name("sink")
  .description("Utility scripts")
  .command("gdoc", "fetch ArchieML Google Doc into JSON file")
  .command("gsheet", "fetch Google Sheet into CSV file")
  .command("fetch", "fetch all Google Docs and Sheets");

program.parse(process.argv);
