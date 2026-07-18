import type { ChatOption } from "./types";

export const INITIAL_GREETING: string[] = [
  ">> LINK ESTABLISHED",
  "Wolf Command online.",
  "State your intent: lore, join, divisions, profile, or help.",
];

export const INITIAL_OPTIONS: ChatOption[] = [
  { label: "How do I join?", message: "join", kind: "primary" },
  { label: "Open Discord", message: "discord", kind: "primary" },
  { label: "Tell me House Wolf lore", message: "house wolf", kind: "secondary" },
  { label: "Explain the Dragoon Code", message: "dragoon code", kind: "secondary" },
  { label: "Rank Structure", message: "ranks", kind: "secondary" },
  { label: "Training Programs", message: "training", kind: "secondary" },
  { label: "Tell me about Kampos", message: "kampos", kind: "secondary" },
  { label: "Help / Commands", message: "help", kind: "secondary" },
];
