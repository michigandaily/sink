import { defineConfig } from "sink";

export default defineConfig({
  fetch_auth: undefined,
  fetch: [
    {
      type: "doc",
      id: "",
      output: "",
      auth: "~/.sink-google-auth-service-account.json",
    },
    {
      type: "sheet",
      id: "",
      sheetId: "0",
      output: "",
      auth: "~/.sink-google-auth-service-account.json",
    },
    {
      type: "json",
      id: "",
      output: "",
      auth: "~/.sink-google-auth-service-account.json",
    },
    {
      type: "text",
      id: "",
      output: "",
      auth: "~/.sink-google-auth-service-account.json",
    },
  ],
  deployment: {
    distribution: "",
    region: "us-east-2",
    bucket: "",
    key: "",
    build: "./dist",
    profile: "sink",
  },
});
