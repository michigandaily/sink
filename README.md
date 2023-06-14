# sink

> Everything and the kitchen sink

A collection of helper scripts that are used across The Michigan Daily's projects.

## Installation

Run `yarn add --dev michigandaily/sink` to get the latest version.

If you want to install a specifc version, add a version tag at the end of the library name (e.g., `michigandaily/sink#v2.8.0`).

## Google Drive fetch

Create a configuration file (e.g. `sink.config.js`). The JavaScript file should have a `fetch` property with an array value. Each element in the array requires a `type`, `id`, `output`, and `auth` property.

```javascript
// sink.config.js
export default {
  fetch: [
    { type: "", id: "", output: "", auth: "" },
    { type: "", id: "", output: "", auth: "" },
    { type: "", id: "", output: "", auth: "" },
    // ...
  ]
}
```

You can also configure `sink` with a JSON file (e.g `sink.config.json` or `config.json`).

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

By default, `sink` will read `sink.config.js`, `sink.config.mjs`, `sink.config.cjs`, `sink.config.json` or `config.json`. You can specify a different configuration file path using the `--config <path>` flag (or `-c <path>` as shorthand).

### Specifying the output file path

For each `output` property, specify an absolute path or a path relative to your configuration file. When a fetch command is run, the relevant file(s) will be written to the `output` path.

### Specifying the authentication file path

In order to fetch files from Google Drive, we have to use an authentication file associated with a Google Cloud Platform (GCP) service account with sufficient view permissions.

> To Daily staffers: ask a managing online editor for access to this authentication file. They will retrieve it for you from 1Password via a private link. The file will be called `.sink-google-auth-service-account.json`. It is recommended that you place this at the home directory of your computer (i.e. `~`) and specify the `auth` property as `~/.sink-google-auth-service-account.json`. Note the `client_email` property inside the authentication file. That email must have view access to files that you wish to fetch.

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

### Creating a service account

In order to create a service account key file (i.e., `.sink-google-auth-service-account.json`), follow these steps:

1. Go to the Google Cloud Platform console.
2. If there is no project associated with sink, create a new project.
3. Access the **IAM & Admin** dashboard.
4. Click on the **Service Accounts** tab.
5. Click on the **Create Service Account** button.
6. Provide an appropriate name, identifier and description for the service account.
7. Create the service account.
8. On the dashboard listing the service accounts, click on the three dots on the right side of the service account you just created under the **Actions** column.
9. Add a new key using JSON format.
10. Save the JSON file to your computer.
11. Rename the JSON file to `.sink-google-auth-service-account.json`.
12. Place the JSON file in your home directory (i.e., `~`).

For security purposes, the service account and associated client email should be regenerated periodically.

## AWS S3 deployment with cache invalidation

Create a configuration file. The file should have a `deployment` property with an object value. The value should include the following properties: `region`, `bucket`, `key`, `build`, and `profile`. The value can optionally include a `distribution` property.

- The `region` property specifies where the S3 bucket is located.
- The `bucket` property will be used to determine which S3 bucket to deploy to.
- The `key` property will be used to determine which sub-directory in the `bucket` to deploy to.
- The `build` property will be used to determine which directory's content will be deployed to S3.
- The `profile` property will be used as the name of the AWS credentials profile specified in `~/.aws/credentials`.
- The `distribution` property specifies the S3 bucket's associated CloudFront distribution. This will be used to invalidate files if needed. If `distribution` is not specified, `sink` will attempt to find a CloudFront distribution associated with the `bucket`. If you do not want to invalidate the bucket's distribution, either set `distribution` as an empty string, `null`, or `false`.

> To Daily staffers: ask a managing online editor for access to AWS credentials. They will retrieve it for you from 1Password via a private link. You will receive a CSV file that contains "Access key ID" and "Secret access key" columns. If you do not already have a file located at `~/.aws/credentials`, create that file. Then populate it with the following:

```plaintext
[sink]
aws_access_key_id=<Insert value from "Access key ID" column here>
aws_secret_access_key=<Insert value from "Secret access key" column here>
```

You'll also need a `build` script as part of `package.json`'s `scripts` property. Internally, `sink` will run `yarn build`. You can skip the build process by adding a `--skip-build` or `-s` flag.

Now, you can deploy to S3 by running `yarn sink deploy aws`.

### IAM User permissions

1. Create a new IAM policy with the following services:
   - **Service**: CloudFront, **Actions**: CreateInvalidation (under the Write access level), ListDistributions (under the List access level) **Resources**: Specific, any in this account and all
   - **Service**: S3, **Actions**: ListBucket (under the List access level), PutObject (under the Write access level), DeleteObject (under the Write access level), **Resources**: Specific, any bucket and any object.
2. Name the policy `sink-deploy`.
3. Create a new IAM user with programmatic access.
4. Attach the existing `sink-deploy` policy directly.
5. Download the credentials CSV file.

An example AWS IAM Policy configuration file (i.e. `example.aws-iam-policy.json`) is provided for reference.

## GitHub Pages deployment

Create a configuration file. The file should have a `deployment` property with an object value. The value should include a `build` property. The value can also optionally include `branch` and `url` properties.

- The `build` property will be used to determine which directory's content will be deployed to GitHub Pages.
- The `branch` property specifies the branch to deploy to. If not specified, `gh-pages` is the default deployment branch.
- The `url` property specifies the URL to deploy to. This should always take the form of `https://<organization>.github.io/<repository>` where `repository` is optional. Even if you are deploying to a custom domain through a `CNAME`, you should still specify the `url` as the bare `github.io` URL.

You'll also need a `build` script as part of `package.json`'s `scripts` property. Internally, `sink` will run `yarn build`. You can skip the build process by adding a `--skip-build` or `-s` flag.

Now you can deploy to GitHub Pages by running `yarn sink deploy github`.

## Troubleshooting

In the case that you get a `RequestTimeTooSkewed` when trying to interact with AWS, you may need to [set your system clock](https://stackoverflow.com/questions/4770635/s3-error-the-difference-between-the-request-time-and-the-current-time-is-too-la) to the correct time.
