// Build-only external-service adapter. Never imported by application/worker code.
if (process.env.CI !== "true" || process.env.COMMAND_BUILD_FIXTURES !== "1") {
  throw new Error("Build fixtures require explicit CI=true and COMMAND_BUILD_FIXTURES=1.");
}
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return original(input, init);
  if (url.hostname === "discord.com" && (!init?.method || init.method === "GET")) return Response.json([]);
  if (url.hostname === "api.fleetyards.net" && (!init?.method || init.method === "GET")) return Response.json([]);
  throw new Error(`External network blocked by the build fixture adapter: ${url.hostname}`);
};
