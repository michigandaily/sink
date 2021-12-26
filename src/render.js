// We will allow sync in these scripts.
/* eslint-disable no-sync */

import fs_extra from "fs-extra";
const { readFileSync, outputFile, mkdirpSync, copySync } = fs_extra;

import glob from "glob";
const { sync } = glob;

import nunjucks from "nunjucks";
const { renderString, configure } = nunjucks;

const bindData = (obj, data) => ({
    data,
    ...(typeof obj === "string" && obj !== null ? { obj } : obj),
  }),
  config = JSON.parse(readFileSync("./config.json", "utf-8")),
  log = (obj) => {
    console.log(obj);
    return obj;
  },
  readFile = (path) => ({
    meta: {
      path,
    },
    content: readFileSync(path, "utf-8"),
  }),
  renderNunjucks = (obj) => {
    const { data, content } = obj,
      output = renderString(content, data);
    configure({ autoescape: false });
    return { ...obj, content: output };
  },
  writeFile = (obj) => {
    const { meta, content } = obj;
    const outfile = meta.path.replace(
      config.render.srcDir,
      config.render.buildDir
    );
    outputFile(outfile, content);
    console.log(`Rendered ${meta.path} -> ${outfile}`);
  };

// let archie = {};
// if (config.archie) {
//   archie = JSON.parse(fs.readFileSync(config.archie.output));
// }

// Ensure build directory exists
mkdirpSync(config.render.buildDir);
copySync(config.render.srcDir, config.render.buildDir);

sync(`${config.render.srcDir}/**/*.html`)
  .map(readFile)
  .map((obj) =>
    bindData(obj, {
      config,
    })
  )
  .map(renderNunjucks)
  .map(writeFile);
