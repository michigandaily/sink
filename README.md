# sink

> Everything and the kitchen sink

A collection of helper scripts that are used across The Michigan Daily's projects.

## Installation

Run `yarn add --dev michigandaily/sink`

## Usage

Create a configuration file (i.e. `config.json`). The JSON file should have a `fetch` property with an array value. Each element in the array requires a `type`, `id`, `output`, and `auth` property.

```json
{
  "fetch": [
    { "type": "", "id": "", "output": "", "auth": "" },
    { "type": "", "id": "", "output": "", "auth": "" },
    { "type": "", "id": "", "output": "", "auth": "" },
    "..."
  ]
}
```

### Specifying the output file path

For each `output` property, specify a path relative to `config.json` or an absolute path. When a fetch command is run, the relevant file(s) will be written to the `output` path.

### Specifying the authentication file path

In order to fetch files from Google Drive, we have to use an authentication file associated with a Google Cloud Platform (GCP) service account with sufficient view permissions.

> To Daily staffers, ask a managing online editor for access to this authentication file. They will retrieve it for you from 1Password via a private link. The file will be called `.daily-google-services.json`. It is recommended that you place this at the home directory of your computer (i.e. `~`) and specify the `auth` property as `~/.daily-google-services.json`. Note the `client_email` property inside the authentication file. That email must have view access to files that you wish to fetch.

### Fetching an ArchieML Google Document as a JSON file

1. Set the value of `type` to `doc`.
2. Consider this generalized Google Doc URL: <https://docs.google.com/document/d/FILE_ID/edit>.
3. Set the value of `id` to `<FILE_ID>`.

To fetch all Google Documents that are specified in `fetch`, run `yarn sink gdoc`.

### Fetching a Google Sheet as a CSV file

1. Set the value of `type` to `sheet`.
2. Consider this generalized Google Sheet URL: <https://docs.google.com/spreadsheets/d/FILE_ID/edit#gid=SHEET_ID>
3. Set the value of `id` to `<FILE_ID>`.
4. Google Sheets require a `sheetId` property in addition to the ones previously mentioned. Set the value of `sheetId` to `<SHEET_ID>`.

To fetch all Google Sheets that are specified in `fetch`, run `yarn sink gsheet`.

### Fetching a JSON file

1. Set the value of `type` to `json`.
2. Consider this generalized Google Drive JSON URL: <https://drive.google.com/file/d/FILE_ID/>. You'll need to click "Get link" in the context menu and then click "Copy link" in the popup in order to get a JSON file's URL.
3. Set the value of `id` to `<FILE_ID>`.

To fetch all JSON files that are specified in `fetch`, run `yarn sink json`.

### Fetching everything

To fetch all files that are specified in `fetch`, run `yarn sink fetch`.
