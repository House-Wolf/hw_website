import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import express from "express";
import { captureRawBody, createBotServiceAuth, createGithubWebhookAuth } from "../bot/httpSecurity.js";

async function serve(t, app) {
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("all six service endpoints attach authentication to the route", async () => {
  const source = await readFile(new URL("../bot/index.js", import.meta.url), "utf8");
  const routes = [...source.matchAll(/app\.post\("([^\"]+)", serviceAuth,/g)].map(match => match[1]);
  assert.deepEqual(routes, ["/create-transaction-thread", "/send-dm", "/send-suspension-dm", "/send-lift-suspension-dm", "/get-member-roles", "/track-marketplace-guest"]);
  assert.match(source, /app\.use\(express\.json\(\{ verify: captureRawBody \}\)\)/);
  assert.match(source, /app\.post\("\/github-webhook", createGithubWebhookAuth\(process\.env\),/);
});

test("Express route aliases cannot bypass service authentication", async t => {
  const app = express();
  let calls = 0;
  app.post("/send-dm", createBotServiceAuth({ NODE_ENV: "production", BOT_SERVICE_TOKEN: "test-secret" }), (_req, res) => { calls++; res.sendStatus(204); });
  const url = await serve(t, app);
  for (const path of ["/send-dm", "/send-dm/", "/SEND-DM", "/SeNd-Dm/?test=1"]) {
    for (const authorization of [undefined, "Bearer wrong", "Basic test-secret"]) {
      const response = await fetch(url + path, { method: "POST", headers: authorization ? { authorization } : {} });
      assert.equal(response.status, 401, path);
    }
    assert.equal((await fetch(url + path, { method: "POST", headers: { authorization: "Bearer test-secret" } })).status, 204);
  }
  assert.equal(calls, 4);
});

test("unconfigured production authentication fails closed while local behavior is preserved", async t => {
  const app = express();
  app.post("/production", createBotServiceAuth({ NODE_ENV: "production" }), (_req, res) => res.sendStatus(204));
  app.post("/development", createBotServiceAuth({ NODE_ENV: "development" }), (_req, res) => res.sendStatus(204));
  const url = await serve(t, app);
  assert.equal((await fetch(url + "/production", { method: "POST" })).status, 503);
  assert.equal((await fetch(url + "/development", { method: "POST" })).status, 204);
});

test("GitHub webhooks verify exact raw bytes before invoking the handler", async t => {
  const app = express();
  const received = [];
  app.use(express.json({ verify: captureRawBody }));
  app.post("/github-webhook", createGithubWebhookAuth({ GITHUB_WEBHOOK_SECRET: "github-test-secret" }), (req, res) => { received.push(req.body); res.sendStatus(204); });
  const url = await serve(t, app);
  const body = '{ "message": "Hello — Wolf" }';
  const signature = `sha256=${createHmac("sha256", "github-test-secret").update(body).digest("hex")}`;
  const post = (payload, sig) => fetch(url + "/GITHUB-WEBHOOK/", { method: "POST", body: payload, headers: { "content-type": "application/json", ...(sig ? { "x-hub-signature-256": sig } : {}) } });
  for (const sig of [undefined, "sha256=00", "sha1=" + "a".repeat(40), "sha256=" + "0".repeat(64), "sha256=" + "z".repeat(64)]) {
    assert.equal((await post(body, sig)).status, 401);
  }
  assert.equal((await post(body + " ", signature)).status, 401);
  assert.equal(received.length, 0);
  assert.equal((await post(body, signature)).status, 204);
  assert.deepEqual(received, [JSON.parse(body)]);
});

test("a webhook without a configured secret or a captured raw body fails closed", async t => {
  const app = express();
  app.post("/unconfigured", createGithubWebhookAuth({}), (_req, res) => res.sendStatus(204));
  app.post("/no-raw-body", createGithubWebhookAuth({ GITHUB_WEBHOOK_SECRET: "secret" }), (_req, res) => res.sendStatus(204));
  const url = await serve(t, app);
  assert.equal((await fetch(url + "/unconfigured", { method: "POST" })).status, 503);
  assert.equal((await fetch(url + "/no-raw-body", { method: "POST", headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) } })).status, 401);
});
