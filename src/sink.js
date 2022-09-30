#!/usr/bin/env node

import { program } from "commander";

program
  .version("2.1.1")
  .name("sink")
  .description("Utility scripts")
  .command("gdoc", "fetch ArchieML Google Doc into JSON file")
  .command("gsheet", "fetch Google Sheet into CSV file")
  .command("json", "fetch JSON files from Google Drive")
  .command("csv", "fetch CSV files from Google Drive")
  .command("fetch", "fetch all Google Docs and Sheets")
  .command("aws", "deploy a build directory to AWS S3");

program.parse(process.argv);
