import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

import { program } from "commander";
import { OAuth2Client } from "google-auth-library";
import chalk from "chalk";
import { success } from "./_utils.js";

const self = fileURLToPath(import.meta.url);

const main = async () => {
  const authPath = "~/.sink-google-auth-oauth-client.json";
  const absoluteAuthPath = authPath.startsWith("~") ? authPath.replace("~", homedir()) : authPath;
  const auth = JSON.parse(readFileSync(absoluteAuthPath).toString());

  const client = new OAuth2Client(
    auth.web.client_id,
    auth.web.client_secret,
    auth.web.redirect_uris[0]
  );

  const authorizationUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive.readonly"
  });

  console.log(
    `Start the OAuth workflow at ${chalk.yellow(authorizationUrl)}.`
  );

  console.log(
    "Note that you are expected to see an error screen after getting redirected to a localhost URL."
  )

  let server;
  const sockets = new Set();

  const token = await new Promise((resolve) => {
    server = createServer(async (req) => {
      const queryParams = new URL(req.url, "http://localhost:3000").searchParams;
      const code = queryParams.get("code");
      const { tokens } = await client.getToken(code);
      resolve(tokens);
    });

    server.listen(3000);

    server.on("connection", (socket) => {
      sockets.add(socket);

      server.once("close", () => {
        sockets.delete(socket);
      })
    })
  });

  for (const socket of sockets) {
    socket.destroy();
    sockets.delete(socket);
  }

  server.close();

  const tokenPath = `${homedir()}/.sink-google-auth-oauth-token.json`
  writeFileSync(
    tokenPath, 
    JSON.stringify({
      type: "oauth",
      clientPath: absoluteAuthPath,
      ...token
    })
  );

  success(`A Google OAuth token has been generated at ${tokenPath}.`);
}

if (process.argv[1] === self) {
  program
    .version("2.7.3")
    .parse();

  main();
}