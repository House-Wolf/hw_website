import type { CommandResult } from "./types";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

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
    // External Links
    // -----------------
    case cmd.includes("discord"): {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("House Wolf Discord")
          .setStyle(ButtonStyle.Link)
          .setURL("https://discord.gg/AGDTgRSG93")
      );

      return {
        content: "Join our Discord community!",
        components: [row]
      };
    }

    // In-site join page
    case cmd.includes("join") || cmd.includes("enlist"): {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Join House Wolf")
          .setStyle(ButtonStyle.Link)
          .setURL("https://robertsspaceindustries.com/en/orgs/CUTTERWOLF")
      );
      return {
        content: "Ready to join the pack?",
        components: [row]
      };
    }

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
