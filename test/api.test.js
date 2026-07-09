import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
const { app } = await import("../server.js");

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

test("health endpoint responds ok", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("can post a job and apply to it", async () => {
  const postRes = await fetch(`${base}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "QA Engineer", company: "Initech" }),
  });
  assert.equal(postRes.status, 201);
  const job = await postRes.json();
  assert.ok(job.id);

  const applyRes = await fetch(`${base}/api/jobs/${job.id}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Peter", email: "peter@initech.com" }),
  });
  assert.equal(applyRes.status, 201);

  const listRes = await fetch(`${base}/api/jobs`);
  const jobs = await listRes.json();
  const found = jobs.find((j) => j.id === job.id);
  assert.equal(found.applications.length, 1);
});

test("posting a job without required fields fails", async () => {
  const res = await fetch(`${base}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "No company" }),
  });
  assert.equal(res.status, 400);
});
