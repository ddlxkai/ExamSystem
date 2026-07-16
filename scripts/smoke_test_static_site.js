#!/usr/bin/env node

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const PROJECT_ROOT = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const CONTENT_TYPES = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
};
const TARGETS = [
  ["/", "text/html", "中级注册安全工程师练习系统"],
  ["/assets/styles.css", "text/css", ":root"],
  ["/assets/app-config.js", "text/javascript", "window.APP_CONFIG"],
  ["/data/sample-data.js", "text/javascript", "window.EXAM_DATA"],
  ["/assets/app.js", "text/javascript", "safety-exam-system-v1"],
];

function resolveRequestPath(requestUrl) {
  const pathname = new URL(requestUrl, `http://${HOST}`).pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(PROJECT_ROOT, relativePath);
  if (!filePath.startsWith(`${PROJECT_ROOT}${path.sep}`) && filePath !== PROJECT_ROOT) {
    return null;
  }
  return filePath;
}

function createServer() {
  return http.createServer((request, response) => {
    const filePath = resolveRequestPath(request.url || "/");
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }
    const contentType = CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
    fs.createReadStream(filePath).pipe(response);
  });
}

async function requestTarget(port, target) {
  const [pathname, expectedType, expectedText] = target;
  const response = await fetch(`http://${HOST}:${port}${pathname}`);
  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    throw new Error(`${pathname} 返回 HTTP ${response.status}`);
  }
  if (!contentType.includes(expectedType)) {
    throw new Error(`${pathname} 响应类型错误：${contentType}`);
  }
  if (!body.includes(expectedText)) {
    throw new Error(`${pathname} 响应内容缺少：${expectedText}`);
  }
  return { pathname, status: response.status, contentType, bytes: Buffer.byteLength(body) };
}

async function main() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });

  try {
    const address = server.address();
    const results = [];
    for (const target of TARGETS) {
      results.push(await requestTarget(address.port, target));
    }
    console.log(JSON.stringify({ status: "passed", resources: results }, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
