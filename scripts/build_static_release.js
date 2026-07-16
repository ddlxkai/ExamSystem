#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "dist");
const RELEASE_FILES = [
  ".nojekyll",
  "index.html",
  "assets/app.js",
  "assets/app-config.js",
  "assets/styles.css",
  "data/sample-data.js",
];

function copyReleaseFile(relativePath) {
  const sourcePath = path.join(PROJECT_ROOT, relativePath);
  const outputPath = path.join(OUTPUT_DIR, relativePath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`发布文件不存在：${relativePath}`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(sourcePath, outputPath);
}

function main() {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const relativePath of RELEASE_FILES) {
    copyReleaseFile(relativePath);
  }

  const files = RELEASE_FILES.map((relativePath) => {
    const filePath = path.join(OUTPUT_DIR, relativePath);
    return { path: relativePath, bytes: fs.statSync(filePath).size };
  });
  console.log(
    JSON.stringify(
      {
        status: "passed",
        output: path.relative(PROJECT_ROOT, OUTPUT_DIR),
        files,
        totalBytes: files.reduce((total, file) => total + file.bytes, 0),
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
