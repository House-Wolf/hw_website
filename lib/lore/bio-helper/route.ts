export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildLoreSmithPrompt } from "@/lib/lore/buildloreSmithPrompt";

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    // ✅ Read incoming JSON
    const data = await req.json();

    // ✅ Build prompt safely
    const prompt = buildLoreSmithPrompt({
      characterName: data.characterName,
      division: data.division,
      subdivision: data.subdivision,
      primaryRole: data.primaryRole,
      tone: data.tone,
      experience: data.experience,
      personalHook: data.personalHook,
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);

    return NextResponse.json({
      bio: result.response.text(),
    });
  } catch (err) {
    console.error("❌ LoreSmith Gemini error:", err);
    return NextResponse.json(
      { error: "Failed to generate bio" },
      { status: 500 }
    );
  }
}
