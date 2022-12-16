# sink

> Everything and the kitchen sink

A collection of helper scripts that are used across The Michigan Daily's projects.

## Installation

Run `yarn add --dev michigandaily/sink`

## Google Drive fetch

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

> To Daily staffers: ask a managing online editor for access to this authentication file. They will retrieve it for you from 1Password via a private link. The file will be called `.daily-google-services.json`. It is recommended that you place this at the home directory of your computer (i.e. `~`) and specify the `auth` property as `~/.daily-google-services.json`. Note the `client_email` property inside the authentication file. That email must have view access to files that you wish to fetch.

### Fetching an ArchieML Google Document as a JSON file

1. Set the value of `type` to `doc`.
2. Consider this generalized Google Doc URL: <https://docs.google.com/document/d/FILE_ID/edit>.
3. Set the value of `id` to `<FILE_ID>`.

To fetch all Google Documents that are specified in `fetch`, run `yarn sink gdoc`.

### Fetching a Google Sheet as a CSV file, TSV file or JSON file

1. Set the value of `type` to `sheet`.
2. Consider this generalized Google Sheet URL: <https://docs.google.com/spreadsheets/d/FILE_ID/edit#gid=SHEET_ID>
3. Set the value of `id` to `<FILE_ID>`.
4. A Google Sheet requires a `sheetId` property in addition to the ones previously mentioned. Set the value of `sheetId` to `<SHEET_ID>`.
5. To fetch the Google Sheet as a CSV file, use a `.csv` extension for the `output`. To fetch as a TSV file, use a `.tsv` extension. To fetch as a JSON file, use a `.json` extension. Other extensions will default to CSV format.

If you wish to fetch all sheets in the spreadsheet, you may forgo specifying a `sheetId`. The `output` property should specify a directory, not a file name. By default, fetching all sheets at once will output CSV files. Specify an `extension` property to fetch other file formats (e.g. `.json`, `.csv` or `.tsv`).

To fetch all Google Sheets that are specified in `fetch`, run `yarn sink gsheet`.

### Fetching a JSON file

1. Set the value of `type` to `json`.
2. Consider this generalized Google Drive JSON URL: <https://drive.google.com/file/d/FILE_ID/>. You'll need to click "Get link" in the context menu and then click "Copy link" in the popup in order to get a JSON file's URL.
3. Set the value of `id` to `<FILE_ID>`.

To fetch all JSON files that are specified in `fetch`, run `yarn sink json`.

### Fetching a text file

Text files can include HTML, CSS, Markdown, CSV files, etc. If you want to fetch a JSON file, use `yarn sink json` instead.

1. Set the value of `type` to `text`.
2. Consider this generalized Google Drive URL: <https://drive.google.com/file/d/FILE_ID/>. You'll need to click "Get link" in the context menu and then click "Copy link" in the popup in order to get a text file's URL.
3. Set the value of `id` to `<FILE_ID>`.

To fetch all text files that are specified in `fetch`, run `yarn sink text`.

### Fetching everything

To fetch all files that are specified in `fetch`, run `yarn sink fetch`.

## AWS S3 deployment with cache invalidation

Create a configuration file (i.e. `config.json`). The JSON file should have a `deployment` property with an object value. The value should include the following properties: `distribution`, `region`, `bucket`, `key`, `build`, and `profile`.

- The `distribution` property specifies the S3 bucket's associated CloudFront distribution. This will be used to invalidate files if needed. If you do not want to invalidate the bucket's distribution, either set `distribution` as an empty string or don't include the property altogether.
- The `region` property specifies where the S3 bucket is located.
- The `bucket` property will be used to determine which S3 bucket to deploy to.
- The `key` property will be used to determine which sub-directory in the `bucket` to deploy to.
- The `build` property will be used to determine which directory's content will be deployed to S3.
- The `profile` property will be used as the name of the AWS credentials profile specified in `~/.aws/credentials`.

> To Daily staffers: ask a managing online editor for access to AWS credentials. They will retrieve it for you from 1Password via a private link. You will receive a CSV file that contains "Access key ID" and "Secret access key" columns. If you do not already have a file located at `~/.aws/credentials`, create that file. Then populate it with the following:

```plaintext
[sink]
aws_access_key_id=<Insert value from "Access key ID" column here>
aws_secret_access_key=<Insert value from "Secret access key" column here>
```

You'll also need a `build` script as part of `package.json`'s `scripts` property. Internally, `sink` will run `yarn build`.

Now, you can deploy to S3 by running `yarn sink deploy aws`.

### IAM User permissions

1. Create a new IAM policy with the following services:
   - **Service**: CloudFront, **Actions**: CreateInvalidation (under the Write access level), **Resources**: Specific, any in this account
   - **Service**: S3, **Actions**: ListBucket (under the List access level), PutObject (under the Write access level), DeleteObject (under the Write access level), **Resources**: Specific, any bucket and any object.
2. Name the policy `sink-deploy`.
3. Create a new IAM user with programmatic access.
4. Attach the existing `sink-deploy` policy directly.
5. Download the credentials CSV file.

## GitHub Pages deployment

Create a configuration file (i.e. `config.json`). The JSON file should have a `deployment` property with an object value. The value should include the following properties: `url` and `build`.

- The `url` property specifies the URL to deploy to. This should always take the form of `https://<organization>.github.io/<repository>` where `repository` is optional. Even if you are deploying to a custom domain through a `CNAME`, you should still specify the `url` as the bare `github.io` URL.
- The `build` property will be used to determine which directory's content will be deployed to GitHub Pages.

You'll also need a `build` script as part of `package.json`'s `scripts` property. Internally, `sink` will run `yarn build`.

Now you can deploy to GitHub Pages by running `yarn sink deploy github`.
