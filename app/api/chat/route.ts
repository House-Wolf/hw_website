import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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

    // Verify API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      return NextResponse.json(
        { error: "Wolf Command offline. Try again shortly." },
        { status: 500 }
      );
    }

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
      return NextResponse.json({
        text: "Command unclear. Try again.",
      });
    }

    return NextResponse.json({
      text: responseText,
    });
  } catch (error) {
    console.error("Groq API Error:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { error: "Wolf Command offline. Try again shortly." },
      { status: 500 }
    );
  }
}
