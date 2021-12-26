// Search directory for configuration file
import chalk from "chalk";
import { findUp } from "find-up";
import { existsSync, readFileSync } from "fs";

export const load_config = async (configFile="config.json") => {
  try {
    const path = await findUp(configFile);
    return { config: JSON.parse(readFileSync(path)) };
  } catch {
    fatal_error("Could not load config file");
  }
};

export const fatal_error = (message) => {
  console.error(`${chalk.red("Fatal Error: ")} ${message}`);
  process.exit(1);
};

export const success = (message) => {
  console.log(chalk.green(message))
}

export const get_auth = (auth, scopes) => {
  if (!existsSync(auth)) {
    fatal_error(`
  Could not open service account credentials at ${auth}.
  Reconfigure fetch.sheets.auth in config.json or download the credentials file.
  `);
  }

  const authObject = new google.auth.GoogleAuth({ keyFile: auth, scopes });
  return authObject
}
