import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { isMarketplaceListingId } from "@/lib/marketplace/server";

export const MARKETPLACE_OAUTH_STATE_COOKIE = "hw_marketplace_oauth_state";
export const MARKETPLACE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

type MarketplaceOAuthState = {
  v: 1;
  listingId: string;
  timestamp: number;
  nonce: string;
};

type ParseResult =
  | { ok: true; state: MarketplaceOAuthState }
  | { ok: false; error: "state_missing" | "state_invalid" | "state_expired" };

function getStateSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET or AUTH_SECRET is required for marketplace OAuth state");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createMarketplaceOAuthState(listingId: string) {
  if (!isMarketplaceListingId(listingId)) {
    throw new Error("Invalid marketplace listing ID");
  }

  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      listingId,
      timestamp: Date.now(),
      nonce: randomBytes(16).toString("base64url"),
    } satisfies MarketplaceOAuthState)
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function hashMarketplaceOAuthState(state: string) {
  return createHash("sha256").update(state).digest("base64url");
}

export function parseMarketplaceOAuthState(rawState: string | null): ParseResult {
  if (!rawState) return { ok: false, error: "state_missing" };

  const [payload, signature, extra] = rawState.split(".");
  if (!payload || !signature || extra) {
    return { ok: false, error: "state_invalid" };
  }

  if (!safeEqual(signature, sign(payload))) {
    return { ok: false, error: "state_invalid" };
  }

  let state: MarketplaceOAuthState;
  try {
    state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "state_invalid" };
  }

  const age = Date.now() - state.timestamp;
  if (
    state.v !== 1 ||
    !isMarketplaceListingId(state.listingId) ||
    !Number.isFinite(state.timestamp) ||
    typeof state.nonce !== "string" ||
    state.nonce.length < 16
  ) {
    return { ok: false, error: "state_invalid" };
  }

  if (age < -30_000 || age > MARKETPLACE_OAUTH_STATE_MAX_AGE_SECONDS * 1000) {
    return { ok: false, error: "state_expired" };
  }

  return { ok: true, state };
}
