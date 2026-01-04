import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are the official House Wolf AI command interface. Speak clearly, concisely, and in-universe.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return NextResponse.json({
    text: completion.choices[0]?.message?.content ?? "",
  });
}
