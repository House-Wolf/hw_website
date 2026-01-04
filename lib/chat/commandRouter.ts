import type { CommandResult } from "./types";

const norm = (s: string) => s.toLowerCase().trim();

export function routeWolfCommand(input: string): CommandResult {
  const cmd = norm(input);

  switch (true) {
    // -----------------
    // Navigation
    // -----------------
    case cmd.includes("profile"):
      return { type: "navigate", path: "/dashboard/profile" };

    case cmd.includes("divisions"):
      return { type: "navigate", path: "/divisions" };

    case cmd.includes("history") || cmd.includes("about"):
      return { type: "navigate", path: "/origins" };

    case cmd === "lore":
      return { type: "navigate", path: "/code" };

    case cmd.includes("fleet"):
      return { type: "navigate", path: "/fleet" };

    // -----------------
    // Lore Topics
    // -----------------
    case cmd.includes("kampos"):
      return { type: "lore", topic: "kampos" };

    case cmd.includes("dragoon"):
    case cmd.includes("code"):
      return { type: "lore", topic: "dragoon-code" };

    case cmd.includes("house wolf"):
    case cmd.includes("housewolf"):
    case cmd.includes("who are you"):
    case cmd.includes("who is house wolf"):
      return { type: "lore", topic: "house-wolf" };

    // -----------------
    // External / Discord Links (INTENT ONLY)
    // -----------------
    case cmd.includes("discord"):
  return {
    type: "options",
    text: "Want to join us on Discord?",
    options: [
      {
        label: "Open Discord",
        message: "open-discord",
        kind: "primary",
      },
    ],
  };

    case cmd.includes("join") || cmd.includes("enlist"):
  return {
    type: "options",
    text: "Ready to join House Wolf?",
    options: [
      {
        label: "How do I join?",
        message: "join",
        kind: "primary",
      },
      {
        label: "Open Discord",
        message: "open-discord",
        kind: "secondary",
      },
    ],
  };

    // -----------------
    // Help
    // -----------------
    case cmd === "help":
    case cmd.includes("commands"):
      return {
        type: "message",
        text:
          "Available:\n" +
          "• profile\n" +
          "• divisions\n" +
          "• lore / house wolf\n" +
          "• kampos\n" +
          "• dragoon code\n" +
          "• discord\n" +
          "• fleet\n" +
          "• join\n",
      };

    // -----------------
    // Fallback
    // -----------------
    default:
      return { type: "ai", text: "I'm not sure how to help with that." };
  }
}
