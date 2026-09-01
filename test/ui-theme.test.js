import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "test";
const { app } = await import("../server.js");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => server.close());

test("web app serves the original dark JobApp theme", async () => {
  const css = await (await fetch(`${base}/style.css`)).text();
  assert.match(css, /--bg:\s*#0f172a/);
  assert.match(css, /--panel:\s*#1e293b/);
  assert.match(css, /--text:\s*#e2e8f0/);
  assert.doesNotMatch(css, /#667eea/);
  assert.doesNotMatch(css, /#764ba2/);
  assert.doesNotMatch(css, /linear-gradient\(90deg,\s*#10b981/);

  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /class="brand"/);
  assert.match(html, /JobApp/);
  assert.doesNotMatch(html, /class="success"/);
});

test("chrome extension popup uses the original dark JobApp theme", async () => {
  const html = await readFile(join(root, "chrome-extension/popup.html"), "utf8");
  assert.match(html, /#0f172a/);
  assert.match(html, /#1e293b/);
  assert.doesNotMatch(html, /#667eea/);
  assert.doesNotMatch(html, /#764ba2/);
  assert.doesNotMatch(
    html,
    /background:\s*linear-gradient\(135deg,\s*#667eea/,
  );
});

test("chrome extension page badge uses the original dark JobApp theme", async () => {
  const js = await readFile(join(root, "chrome-extension/content.js"), "utf8");
  assert.match(js, /#0f172a|#1e293b|#6366f1/);
  assert.doesNotMatch(js, /#667eea/);
  assert.doesNotMatch(js, /#764ba2/);
});
