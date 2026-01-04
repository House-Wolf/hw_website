import type { CommandResult } from "./types";

const norm = (s: string) => s.toLowerCase().trim();

export function routeWolfCommand(input: string): CommandResult {
  const cmd = norm(input);

  switch (true) {
    // =====================================================
    // BUTTON ACTIONS (MUST COME FIRST)
    // =====================================================

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

    // =====================================================
    // NAVIGATION
    // =====================================================

    case cmd.includes("profile"):
      return { type: "navigate", path: "/dashboard/profile" };

    case cmd.includes("divisions"):
      return { type: "navigate", path: "/divisions" };

    case cmd.includes("history"):
    case cmd.includes("about"):
      return { type: "navigate", path: "/origins" };

    case cmd === "lore":
      return { type: "navigate", path: "/code" };

    case cmd.includes("fleet"):
      return { type: "navigate", path: "/fleet" };

    // =====================================================
    // LORE TOPICS
    // =====================================================

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

    // =====================================================
    // DISCORD / JOIN (OPENING-STYLE BUTTONS)
    // =====================================================

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
          {
            label: "How do I join?",
            message: "open-join",
            kind: "secondary",
          },
        ],
      };

    case cmd.includes("join"):
    case cmd.includes("enlist"):
      return {
        type: "options",
        text: "Ready to join House Wolf?",
        options: [
          {
            label: "How do I join?",
            message: "open-join",
            kind: "primary",
          },
          {
            label: "Open Discord",
            message: "open-discord",
            kind: "secondary",
          },
        ],
      };

    // =====================================================
    // HELP
    // =====================================================

    case cmd === "help":
    case cmd.includes("commands"):
      return {
        type: "options",
        text: "Here’s what I can help with:",
        options: [
          { label: "How do I join?", message: "join", kind: "primary" },
          { label: "Open Discord", message: "open-discord" },
          { label: "Tell me House Wolf lore", message: "house wolf" },
          { label: "Explain the Dragoon Code", message: "dragoon code" },
          { label: "Tell me about Kampos", message: "kampos" },
        ],
      };

    // =====================================================
    // FALLBACK
    // =====================================================

    default:
      return {
        type: "ai",
        text: "I’m not sure how to help with that. Try **help**.",
      };
  }
}
