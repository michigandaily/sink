# sink

> Everything and the kitchen sink

A collection of helper scripts that are used across The Michigan Daily's projects.

## Installation

Run `yarn add --dev michigandaily/sink`

## Usage

It's really easy, just run

```sh
sink gsheet  # fetch Google Sheets
sink gdoc    # fetch Google Docs
sink json    # fetch JSON files
sink fetch   # fetch everything
```

Like before, you still need a `config.json` (usually comes with the template that is using `sink`) and an `auth.json` (usually comes with your MOE).
