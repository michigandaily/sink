import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

import chalk from "chalk";
import { GoogleAuth } from "google-auth-library";
import { findUp } from "find-up";

// Search directory for configuration file
export const load_config = async (configFile = "config.json") => {
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
  console.log(chalk.green(message));
};

export const get_auth = (path, scopes) => {
  const file = path.startsWith("~") ? path.replace("~", homedir()) : path;
  if (!existsSync(file)) {
    fatal_error(`
  Could not open service account credentials at ${file}.
  Reconfigure your auth properties in config.json or download the credentials file.
  `);
  }

  return new GoogleAuth({ keyFile: file, scopes });
};
