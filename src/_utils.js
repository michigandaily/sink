// Search directory for configuration file
import chalk from "chalk";
import { findUp } from "find-up";
import { readFileSync } from "fs";

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
