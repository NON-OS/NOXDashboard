#!/usr/bin/env node
// Serves the prebuilt NOX dashboard from a local static server and opens it in
// the browser. Zero dependencies. The dashboard runs entirely in your browser
// and talks only to the RPC and wallet you choose; this process serves files.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const host = "127.0.0.1";
const startPort = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const target = normalize(join(root, clean));
  if (!target.startsWith(root)) return null; // path traversal guard
  try {
    const s = await stat(target);
    if (s.isFile()) return target;
    if (s.isDirectory()) return join(target, "index.html");
  } catch {
    /* fall through to SPA shell */
  }
  return join(root, "index.html"); // SPA fallback
}

const server = createServer(async (req, res) => {
  try {
    const file = await resolveFile(req.url || "/");
    if (!file) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const body = await readFile(file);
    const type = TYPES[extname(file)] || "application/octet-stream";
    const cache = file.includes(`${join(root, "assets")}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    res.writeHead(200, { "content-type": type, "cache-control": cache });
    res.end(body);
  } catch {
    res.writeHead(500).end("internal error");
  }
});

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* opening is best-effort */
  }
}

function listen(port, attemptsLeft = 12) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error("failed to start:", err.message);
      process.exit(1);
    }
  });
  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log(`\n  NOX dashboard  ${url}`);
    console.log("  local only  ·  your RPC, your wallet  ·  ctrl-c to stop\n");
    if (process.env.NOX_NO_OPEN !== "1") openBrowser(url);
  });
}

listen(startPort);
