# sink

> Everything and the kitchen sink

A collection of helper scripts that are used across The Michigan Daily's
projects.

## Installation

Run `yarn add --dev https://github.com/MichiganDaily/sink`

## Usage

It's really easy, just run

```sh
sink gsheet  # fetch Google Sheets
sink gdoc    # fetch Google Docs
sink fetch # fetch Google Sheets and Docs
```

Like before, you still need a `config.json` (usually comes with the template
that is using `sink`) and an `auth.json` (usually comes with your MOE).
