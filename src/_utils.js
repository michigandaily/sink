import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

import chalk from "chalk";
import { GoogleAuth } from "google-auth-library";
import { findUp } from "find-up";

export const has_filled_props = (o) => Object.values(o).every((v) => v.length);

// Search directory for configuration file
export const load_config = async (configFile = "config.json") => {
  try {
    const path = await findUp(configFile);
    return { config: JSON.parse(readFileSync(path)) };
  } catch {
    fatal_error("Could not load config file");
  }
};

export const write_file = (output, content) => {
  const dir = output.substring(0, output.lastIndexOf("/"));
  if (!existsSync(dir.length > 0 ? dir : ".")) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(output, content);
};

export const fatal_error = (message) => {
  console.error(`${chalk.red("Fatal Error: ")} ${message}`);
  process.exit(1);
};

export const success = (message) => {
  console.log(chalk.green(message));
};

export const get_auth = (path, scopes) => {
  if (path === undefined || typeof path !== "string") {
    fatal_error(`
    Missing "auth" property when trying to find account credentials.
    Configure your "auth" properties in config.json.
    `);
  }

  const file = path.startsWith("~") ? path.replace("~", homedir()) : path;
  if (!existsSync(file)) {
    fatal_error(`
    Could not open service account credentials at ${file}.
    Reconfigure your "auth" properties in config.json or download the credentials file.
    `);
  }

  return new GoogleAuth({ keyFile: file, scopes });
};
