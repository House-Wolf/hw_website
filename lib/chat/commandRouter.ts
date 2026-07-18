import type { CommandResult } from "./types";

const norm = (s: string) => s.toLowerCase().trim();

// Check if input is a question (should go to AI for nuanced answers)
const isQuestion = (s: string): boolean => {
  const questionPatterns = [
    /^(what|where|who|when|why|how|can|could|would|should|is|are|do|does|did|tell me about|explain|describe)/i,
    /\?$/,
    /^(what's|where's|who's|how's|what are|where are|who are|how are|how do|how does)/i,
  ];
  return questionPatterns.some((pattern) => pattern.test(s.trim()));
};

// Check if input is a simple topic request (just the topic name or "about X")
const isSimpleTopicRequest = (s: string, topic: string): boolean => {
  const normalized = norm(s);
  // Match: exact topic, "about topic", "topic info", "topic information"
  const simplePatterns = [
    new RegExp(`^${topic}$`),
    new RegExp(`^about ${topic}$`),
    new RegExp(`^${topic} info(rmation)?$`),
    new RegExp(`^tell me ${topic}$`),
  ];
  return simplePatterns.some((pattern) => pattern.test(normalized));
};

export function routeWolfCommand(input: string): CommandResult {
  const cmd = norm(input);

  // If it's a question, let the AI handle it for nuanced responses
  if (isQuestion(input)) {
    return { type: "ai", prompt: input };
  }

  switch (true) {
    // -----------------------------
    // BUTTON ACTION TOKENS
    // -----------------------------
    case cmd === "open-discord":
      return {
        type: "external",
        label: "House Wolf Discord",
        url: "https://discord.gg/AGDTgRSG93",
      };

    case cmd === "open-join":
      return {
        type: "external",
        label: "Join House Wolf",
        url: "https://robertsspaceindustries.com/en/orgs/CUTTERWOLF",
      };

    // -----------------------------
    // NAVIGATION
    // -----------------------------
    case cmd.includes("profile"):
      return { type: "navigate", path: "/dashboard/profile" };

    case cmd.includes("divisions"):
      return { type: "navigate", path: "/divisions" };

    case cmd.includes("fleet"):
      return { type: "navigate", path: "/fleet" };

    case cmd.includes("marketplace"):
      return { type: "navigate", path: "/marketplace" };

    case cmd.includes("dashboard"):
      return { type: "navigate", path: "/dashboard" };

    case cmd.includes("settings"):
      return { type: "navigate", path: "/dashboard/settings" };

    case cmd.includes("leadership"):
    case cmd.includes("leaders"):
      return { type: "navigate", path: "/leadership" };

    case cmd.includes("origins"):
    case cmd.includes("history"):
      return { type: "navigate", path: "/origins" };

    case cmd.includes("socials"):
    case cmd.includes("social links"):
      return { type: "navigate", path: "/socials" };

    case /\b(home|main page|start)\b/.test(cmd):
      return { type: "navigate", path: "/" };

    case cmd.includes("admin"):
      return { type: "navigate", path: "/dashboard/admin" };

    // -----------------------------
    // LORE (STATIC)
    // -----------------------------
    case cmd.includes("kampos"):
      return { type: "lore", topic: "kampos" };

    case cmd.includes("dragoon"):
    case cmd.includes("code"):
      return { type: "lore", topic: "dragoon-code" };

    case cmd.includes("house wolf"):
      return { type: "lore", topic: "house-wolf" };

    case cmd.includes("resol"):
    case cmd.includes("principles"):
      return { type: "lore", topic: "resol'nare" };

    case cmd.includes("rank"):
      return { type: "lore", topic: "ranks" };

    case cmd.includes("training"):
    case cmd.includes("foundling"):
      return { type: "lore", topic: "training" };

    case cmd.includes("recruitment"):
    case cmd.includes("what we want"):
    case cmd.includes("expectations"):
      return { type: "lore", topic: "recruitment" };

    // -----------------------------
    // OPTIONS (PILL BUTTONS)
    // -----------------------------
    case cmd.includes("discord"):
      return {
        type: "options",
        text: "Want to join us on Discord?",
        options: [
          { label: "Open Discord", message: "open-discord", kind: "primary" },
          { label: "How do I join?", message: "open-join", kind: "secondary" },
        ],
      };

    case cmd.includes("join"):
      return {
        type: "options",
        text: "Ready to join House Wolf?",
        options: [
          { label: "How do I join?", message: "open-join", kind: "primary" },
          { label: "Open Discord", message: "open-discord", kind: "secondary" },
        ],
      };

    case cmd === "help":
    case cmd.includes("commands"):
      return {
        type: "options",
        text: "What would you like to explore? You can also ask me any question or say 'navigate to [page]'.",
        options: [
          { label: "Join House Wolf", message: "join", kind: "primary" },
          { label: "Discord Server", message: "discord", kind: "primary" },
          { label: "House Wolf Lore", message: "house wolf", kind: "secondary" },
          { label: "Dragoon Code", message: "dragoon code", kind: "secondary" },
          { label: "Marketplace", message: "marketplace", kind: "secondary" },
          { label: "Dashboard", message: "dashboard", kind: "secondary" },
        ],
      };

    // -----------------------------
    // EVERYTHING ELSE → GROQ
    // -----------------------------
    default:
      return {
        type: "ai",
        prompt: input,
      };
  }
}
