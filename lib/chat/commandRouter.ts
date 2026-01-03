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

    // -----------------
    // External Links
    // -----------------
    case cmd.includes("discord"):
      return {
        type: "external",
        label: "House Wolf Discord",
        url: "https://discord.gg/AGDTgRSG93",
      };

    // In-site join page
    case cmd.includes("join") || cmd.includes("enlist"):
      return { 
        type: "external",
        label: "Join House Wolf",
        url: "https://robertsspaceindustries.com/en/orgs/CUTTERWOLF",
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
          "• join\n" +
          "• continue / more\n" +
          "• expand lore",
      };

    // -----------------
    // Fallback
    // -----------------
    default:
      return { type: "ai", text: "I'm not sure how to help with that." };
  }
}
