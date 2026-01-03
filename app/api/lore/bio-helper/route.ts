import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    characterName,
    division,
    subdivision,
    primaryRole,
    tone,
    experience,
    personalHook,
  } = await req.json();

  // Basic validation
  if (!division || !primaryRole) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const systemPrompt = `
You are the official Lore Scribe of House Wolf,
a disciplined mercenary organization.

Write in-universe mercenary dossiers.
Tone: grounded military sci-fi.
No memes. No slang. No emojis.
Max 700 characters.
`;

  const userPrompt = `
Character Name: ${characterName || "Unregistered Operative"}
Division: ${division}
Subdivision: ${subdivision ?? "N/A"}
Primary Role: ${primaryRole}
Tone Preference: ${tone ?? "Balanced"}
Experience Highlights: ${experience || "N/A"}
Personal Note: ${personalHook ?? "N/A"}

Write ONE bio variant in third person.
`;

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not configured");
    return NextResponse.json(
      { error: "AI service not configured. Please add GROQ_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      console.error("Request details:", {
        model: "llama-3.1-8b-instant",
        systemPrompt: systemPrompt.slice(0, 100) + "...",
        userPrompt: userPrompt.slice(0, 100) + "...",
      });
      return NextResponse.json(
        { error: `AI service error: ${response.status} - ${errorText}` },
        { status: 503 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    if (!text) {
      console.error("No text generated from Groq API");
      return NextResponse.json(
        { error: "No bio generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bio: text.slice(0, 1400), // hard cap
    });
  } catch (error) {
    console.error("Bio generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate bio" },
      { status: 500 }
    );
  }

}
