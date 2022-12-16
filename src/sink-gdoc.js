#!/usr/bin/env node

// https://github.com/newsdev/archieml-js
// TODO:
// - Remove styles from item keys
// - Make keys case insensitive (lowercase all)

import { fileURLToPath } from "node:url";

import { program } from "commander";
import { drive } from "@googleapis/drive";
import { decode } from "html-entities";

import archieml from "archieml";
const { load } = archieml;

import { DomHandler, Parser } from "htmlparser2";

import {
  load_config,
  success,
  get_auth,
  write_file,
  has_filled_props,
  fatal_error,
} from "./_utils.js";

const parse = (file) => {
  return new Promise((res, rej) => {
    const handler = new DomHandler(function (error, dom) {
      if (error) {
        rej(error);
        return;
      }
      const tagHandlers = {
        _base: function (tag) {
          let str = "",
            func;
          tag.children.forEach(function (child) {
            if ((func = tagHandlers[child.name || child.type]))
              str += func(child);
          });
          return str;
        },
        text: function (textTag) {
          return textTag.data;
        },
        span: function (spanTag) {
          const style = spanTag.attribs.style;
          let str = tagHandlers._base(spanTag);
          if (style && style.includes("font-weight:700")) {
            str = `<b>${str}</b>`;
          }
          if (style && style.includes("font-style:italic")) {
            str = `<em>${str}</em>`;
          }
          return str;
        },
        p: function (pTag) {
          return tagHandlers._base(pTag) + "\n";
        },
        a: function (aTag) {
          let href = aTag.attribs.href;
          if (href === undefined) return "";

          // extract real URLs from Google's tracking
          // from: http://www.google.com/url?q=http%3A%2F%2Fwww.nytimes.com...
          // to: http://www.nytimes.com...
          if (
            href &&
            new URL(href).search &&
            new URL(href).searchParams.has("q")
          ) {
            href = new URL(href).searchParams.get("q");
          }

          let str = '<a href="' + href + '">';
          str += tagHandlers._base(aTag);
          str += "</a>";
          return str;
        },
        li: function (tag) {
          return "* " + tagHandlers._base(tag) + "\n";
        },
      };

      ["ul", "ol"].forEach(function (tag) {
        tagHandlers[tag] = tagHandlers.span;
      });
      ["h1", "h2", "h3", "h4", "h5", "h6"].forEach(function (tag) {
        tagHandlers[tag] = tagHandlers.p;
      });

      const body = dom[0].children[1];
      let parsedText = tagHandlers._base(body);

      // Convert html entities into the characters as they exist in the google doc
      parsedText = decode(parsedText);

      // Remove smart quotes from inside tags
      parsedText = parsedText.replace(/<[^<>]*>/g, function (match) {
        return match.replace(/”|“/g, '"').replace(/‘|’/g, "'");
      });

      const parsed = load(parsedText);
      res(parsed);
    });
    const parser = new Parser(handler);
    parser.write(file.data);
    parser.end();
  });
};

export const fetchDoc = async ({ id, output, auth }) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];
  const authObject = get_auth(auth, scopes);

  const gdrive = drive({ version: "v3", auth: authObject });

  let file;
  try {
    file = await gdrive.files.export({ fileId: id, mimeType: "text/html" });
  } catch (e) {
    fatal_error(`
    Error when fetching document with fileId ${id}. Check the file identifer or your file access permissions.
    ${e.stack}
    `);
  }

  const json = await parse(file);
  write_file(output, JSON.stringify(json));
  success(`Wrote output to ${output}`);
};

const main = async (opts) => {
  const { config } = await load_config(opts.config);
  config.fetch
    ?.filter((d) => d.type === "doc" && has_filled_props(d))
    .forEach(fetchDoc);
};

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  program
    .version("2.5.1")
    .option("-c, --config <path>", "path to config file")
    .parse();

  main(program.opts());
}
