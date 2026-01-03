export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildWolfChatPrompt } from "@/lib/chat/wolfPrompt";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const { message, userName } = await req.json();

    const prompt = buildWolfChatPrompt(message, userName);

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Groq error:", text);
      return NextResponse.json({ error: "AI failed" }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      text: data.choices[0].message.content,
    });
  } catch (err) {
    console.error("WolfChat API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
