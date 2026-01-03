export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * FREE + simple in-memory limiter (works great in local dev / single node)
 * Note: On serverless multi-instance, per-instance limits apply.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1 min
const MAX_REQ_PER_WINDOW = 12;

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "local";
}

function rateLimit(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_REQ_PER_WINDOW - 1, resetAt: now + WINDOW_MS };
  }
  if (b.count >= MAX_REQ_PER_WINDOW) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: MAX_REQ_PER_WINDOW - b.count, resetAt: b.resetAt };
}

/**
 * Action protocol the UI can execute safely
 */
type WolfAction =
  | { type: "navigate"; href: "/dashboard/profile" | "/mercenaries" | "/lore" | "/dashboard" }
  | { type: "none" };

const SYSTEM_PROMPT = `
You are the House Wolf Command Interface.

GOAL:
Greet visitors, answer questions about House Wolf, and guide users to site features.

TONE:
- Calm
- Professional
- In-universe mercenary
- No slang
- No emojis
- No real-world references

HARD RULES:
- Keep replies under 120 words
- Do not invent ranks
- Do not assign divisions
- Never ask for personal information
- If user asks for “where do I go”, suggest the correct page.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "reply": "string",
  "action": { "type": "none" } OR { "type": "navigate", "href": "/dashboard/profile" | "/mercenaries" | "/lore" | "/dashboard" }
}

If you are unsure, set action.type = "none".
`;

function safeJsonParse(text: string): { reply: string; action: WolfAction } | null {
  try {
    // Gemini sometimes wraps JSON in ```json fences — strip them.
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const obj = JSON.parse(cleaned);

    if (typeof obj?.reply !== "string") return null;

    const action = obj?.action;
    if (!action || typeof action.type !== "string") {
      return { reply: obj.reply, action: { type: "none" } };
    }

    if (action.type === "navigate") {
      const href = action.href;
      const allowed = ["/dashboard/profile", "/mercenaries", "/lore", "/dashboard"];
      if (allowed.includes(href)) {
        return { reply: obj.reply, action: { type: "navigate", href } };
      }
      return { reply: obj.reply, action: { type: "none" } };
    }

    return { reply: obj.reply, action: { type: "none" } };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    }

    const ip = getClientIp(req);
    const lim = rateLimit(ip);

    if (!lim.ok) {
      return NextResponse.json(
        {
          error: "Rate limited",
          resetAt: lim.resetAt,
        },
        { status: 429 }
      );
    }

    const { message, userName } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const contextualLine =
      userName && typeof userName === "string"
        ? `User context: Logged-in operative name is "${userName}".`
        : `User context: Visitor name is unknown.`;

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: contextualLine },
      { text: `User message: ${message}` },
    ]);

    const raw = result.response.text();
    const parsed = safeJsonParse(raw);

    // If AI fails to follow JSON, fall back safely
    if (!parsed) {
      return NextResponse.json({
        reply: raw.slice(0, 600),
        action: { type: "none" } as WolfAction,
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("🐺 Wolf Chat AI error:", err);
    return NextResponse.json({ error: "Command channel disrupted" }, { status: 500 });
  }
}
