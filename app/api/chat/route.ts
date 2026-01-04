import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.prompt || body.message;

    if (!userMessage) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
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

    return NextResponse.json({
      text: completion.choices[0]?.message?.content ?? "Command unclear. Try again.",
    });
  } catch (error) {
    console.error("Groq API Error:", error);
    return NextResponse.json(
      { error: "Wolf Command offline. Try again shortly." },
      { status: 500 }
    );
  }
}
