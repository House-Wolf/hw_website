import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import {
  createRateLimitHeaders,
  getClientIp,
  getRateLimitIdentifier,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const identifier = getRateLimitIdentifier(undefined, getClientIp(req.headers));
  const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.CHAT);
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 8_192) {
      return NextResponse.json(
        { error: "Message is too large." },
        { status: 413, headers: rateLimitHeaders }
      );
    }

    const body = await req.json();
    const userMessage = body.prompt || body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (userMessage.length > 1_000) {
      return NextResponse.json(
        { error: "Message must be 1,000 characters or less." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Verify API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      return NextResponse.json(
        { error: "Wolf Command offline. Try again shortly." },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Updated to latest model
      messages: [
        {
          role: "system",
          content:
            "You are the official House Wolf AI command interface. Speak clearly, concisely, and in-universe. Keep responses under 100 words. Use military/mercenary terminology. No emojis.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      console.error("Groq returned empty response");
      return NextResponse.json(
        {
          text: "Command unclear. Try again.",
        },
        { headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      {
        text: responseText,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("Groq API Error:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { error: "Wolf Command offline. Try again shortly." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
