#!/usr/bin/env node

import { program } from "commander/esm.mjs";

program
  .version("1.0.0")
  .name("sink")
  .description("Utility scripts")
  .command("gdoc", "fetch Google archieml doc into JSON file")
  .command("gsheet", "fetch Google sheet into CSV file");

program.parse(process.argv);
