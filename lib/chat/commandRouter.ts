type CommandResult =
  | { type: "navigate"; path: string }
  | { type: "external"; url: string; label: string }
  | { type: "lore"; topic: string }
  | { type: "message"; text: string }
  | { type: "ai" };

export function routeWolfCommand(input: string): CommandResult {
  const cmd = input.toLowerCase();

  // -----------------
  // Navigation
  // -----------------
  if (cmd.includes("profile")) {
    return { type: "navigate", path: "/dashboard/profile" };
  }

  if (cmd.includes("divisions")) {
    return { type: "navigate", path: "/divisions" };
  }

  if (cmd.includes("lore") || cmd.includes("house wolf")) {
    return { type: "navigate", path: "/code" };
  }

  if (cmd.includes("history") || cmd.includes("about us")) {
    return { type: "navigate", path: "/origins" };
  }

  // -----------------
  // External Links
  // -----------------
  if (cmd.includes("discord")) {
    return {
      type: "external",
      url: "https://discord.gg/AGDTgRSG93",
      label: "House Wolf Discord",
    };
  }

  if (cmd.includes("join") || cmd.includes("enlist")) {
    return {
      type: "external",
      url: "/join",
      label: "Join House Wolf",
    };
  }

  // -----------------
  // Lore Triggers
  // -----------------
  if (cmd.includes("kampos")) {
    return { type: "lore", topic: "kampos" };
  }

  if (cmd.includes("dragoon") || cmd.includes("code")) {
    return { type: "lore", topic: "dragoon-code" };
  }

  // -----------------
  // Help
  // -----------------
  if (cmd.includes("help")) {
    return {
      type: "message",
      text:
        "I can guide you through House Wolf.\n" +
        "Ask about our lore, find your path, or request navigation.",
    };
  }

  // -----------------
  // Fallback to AI
  // -----------------
  return { type: "ai" };
}
