import { createHmac, timingSafeEqual } from "node:crypto";

export function captureRawBody(req, _res, buffer) {
  req.rawBody = buffer;
}

export function createGithubWebhookAuth(environment) {
  return (req, res, next) => {
    const secret = environment.GITHUB_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: "GitHub webhook authentication is not configured" });
    const signature = req.get("x-hub-signature-256") || "";
    if (!/^sha256=[a-f0-9]{64}$/i.test(signature) || !Buffer.isBuffer(req.rawBody)) {
      return res.status(401).json({ error: "Invalid GitHub webhook signature" });
    }
    const supplied = Buffer.from(signature.slice(7), "hex");
    const expected = createHmac("sha256", secret).update(req.rawBody).digest();
    if (!timingSafeEqual(supplied, expected)) return res.status(401).json({ error: "Invalid GitHub webhook signature" });
    return next();
  };
}

export function createBotServiceAuth(environment) {
  const token = environment.BOT_SERVICE_TOKEN;
  return (req, res, next) => {
    if (!token) {
      if (environment.NODE_ENV === "production") return res.status(503).json({ error: "Bot service authentication is not configured" });
      return next();
    }
    const supplied = Buffer.from(req.get("authorization") || "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  };
}
