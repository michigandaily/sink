import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import chalk from "chalk";
import { GoogleAuth } from "google-auth-library";
import { findUp } from "find-up";
import "dotenv/config"

const _is_js_config = (filename) => {
  return filename.slice(-2) === "js";
}

export const read_json_config = (path) => {
  return { config: JSON.parse(readFileSync(path)) };
}

export const read_js_config = async (path) => {
  const config = (await import(pathToFileURL(path))).default
  return { config }
}

export const has_filled_props = (o) => Object.values(o).every((v) => v.length);

// Search directory for configuration file
export const load_config = async (configFile = null) => {
  const defaults = ["sink.config.js", "sink.config.mjs", "sink.config.cjs", "sink.config.json", "config.json"];
  const searchFiles = configFile ? [configFile, ...defaults] : defaults
  for (const searchFile of searchFiles) {
    const path = await findUp(searchFile);
    if (typeof path === "undefined") continue;
    if (_is_js_config(path)) {
      return await read_js_config(path)
    }
    return read_json_config(path)
  }
  fatal_error("Could not load config file");
};

export const write_file = (output, content) => {
  const dir = dirname(output);
  if (!existsSync(dir)) {
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
    console.log('Missig "auth" property when trying to find account credentials. Falling back to "GOOGLE_DRIVE_AUTH" environment credentials.');

    const auth_contents = process.env.GOOGLE_DRIVE_AUTH;
    if (auth_contents === undefined) {
      fatal_error(`Could not find "GOOGLE_DRIVE_AUTH" environment variable.`);
    }

    return new GoogleAuth({ credentials: JSON.parse(auth_contents), scopes });
  }

  const file = path.startsWith("~") ? path.replace("~", homedir()) : path;
  if (!existsSync(file)) {
    fatal_error(`
    Could not open service account credentials at ${file}.
    Reconfigure the "auth" properties in your configuration file or download the credentials file.
    `);
  }

  return new GoogleAuth({ keyFile: file, scopes });
};
