import type { CommandResult } from "./types";

const norm = (s: string) => s.toLowerCase().trim();

export function routeWolfCommand(input: string): CommandResult {
  const cmd = norm(input);

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
        text: "What would you like to explore?",
        options: [
          { label: "Join House Wolf", message: "join", kind: "primary" },
          { label: "Discord Server", message: "discord", kind: "primary" },
          { label: "House Wolf Lore", message: "house wolf", kind: "secondary" },
          { label: "Dragoon Code", message: "dragoon code", kind: "secondary" },
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
