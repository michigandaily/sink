import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

import { program } from "commander";
import { fatal_error, get_auth } from "./_utils.js";
import { iam } from "@googleapis/iam";

const self = fileURLToPath(import.meta.url);

const main = async ({ credentials, accountId }) => {
  const scopes = ["https://www.googleapis.com/auth/cloud-platform"];
  const authObject = get_auth(credentials, scopes);
  const admin = iam({ version: "v1", auth: authObject });

  const projectId = await authObject.getProjectId();

  let serviceAccount;
  try {
    serviceAccount = await admin.projects.serviceAccounts.create({
      name: `projects/${projectId}`,
      requestBody: {
        accountId,
      },
    });
  } catch (e) {
    fatal_error(`
    Error when creating service account ${accountId} in ${projectId}.
    ${e.stack}
    `);
  }

  let serviceAccountKey;
  try {
    if (serviceAccount.data.name) {
      serviceAccountKey = await admin.projects.serviceAccounts.keys.create({
        name: serviceAccount.data.name
      })
    }
  } catch (e) {
    fatal_error(`
    Error when creating service account key for ${serviceAccount.data.displayName}.
    ${e.stack}
    `)
  }

  writeFileSync(
    `./sink-google-auth-service-account-${accountId}.json`,
    Buffer.from(serviceAccountKey.data.privateKeyData, "base64").toString("utf-8")
  )
};

if (process.argv[1] === self) {
  program
    .version("2.8.0")
    .requiredOption(
      "-c, --credentials <path>",
      "path to the project's service account credentials file"
    )
    .requiredOption(
      "-a, --account-id <id>",
      "account id that is used to generate the service account email address and a stable unique id. It is unique within a project, must be 6-30 characters long, and match the regular expression [a-z]([-a-z0-9]*[a-z0-9]) to comply with RFC1035."
    )
    .parse();

  main(program.opts());
}
