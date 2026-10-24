import assert from "node:assert/strict";
import { test } from "node:test";
import { previewEnvironment } from "./dev-command-local.mjs";

test("local preview overrides remote datasource and delivery flags without removing Discord login", () => {
  const source = { DATABASE_URL: "postgresql://example.invalid/production", COMMAND_DISCORD_DELIVERY_ENABLED: "true", DISCORD_CLIENT_ID: "oauth-fixture", DISCORD_CLIENT_SECRET: "secret-fixture" };
  const result = previewEnvironment(source);
  assert.equal(new URL(result.DATABASE_URL).hostname, "127.0.0.1");
  assert.equal(result.COMMAND_DISCORD_DELIVERY_ENABLED, "false");
  assert.equal(result.COMMAND_STAFFING_ENABLED, "true");
  assert.equal(result.DISCORD_CLIENT_SECRET, source.DISCORD_CLIENT_SECRET);
  assert.equal(result.NEXTAUTH_URL, "http://localhost:3000");
  assert.equal(source.COMMAND_DISCORD_DELIVERY_ENABLED, "true");
});
test("preview rejects remote or incorrectly named test database overrides", () => {
  for (const url of ["postgresql://example.invalid/housewolf_command_test", "postgresql://localhost/production", "not-a-url"]) {
    assert.throws(() => previewEnvironment({ COMMAND_TEST_DATABASE_URL: url }));
  }
});
