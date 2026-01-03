export type CommandResult =
  | { type: "navigate"; path: string }
  | { type: "message"; text: string }
  | {
      type: "externalButtons";
      text: string;
      buttons: {
        label: string;
        url: string;
      }[];
    }
  | { type: "lore"; topic: string }
  | { type: "ai" };

export function routeWolfCommand(input: string): CommandResult {
  const cmd = input.toLowerCase().trim();

  switch (true) {
    case cmd.includes("profile"):
      return { type: "navigate", path: "/dashboard/profile" };

    case cmd.includes("divisions"):
      return { type: "navigate", path: "/divisions" };

    case cmd.includes("history") || cmd.includes("origins"):
      return { type: "navigate", path: "/origins" };

    case cmd.includes("lore"):
      return { type: "lore", topic: "/code" };

    case cmd.includes("join"):
    case cmd.includes("enlist"):
      return {
        type: "externalButtons",
        text: "House Wolf recruitment channels are open. Choose your entry point:",
        buttons: [
          {
            label: "Join Discord",
            url: "https://discord.gg/AGDTgRSG93",
          },
          {
            label: "Join Today",
            url: "https://robertsspaceindustries.com/en/orgs/CUTTERWOLF",
          },
        ],
      };

    case cmd.includes("kampos"):
      return { type: "lore", topic: "kampos" };

    case cmd.includes("code"):
      return { type: "lore", topic: "dragoon-code" };

    case cmd.includes("help"):
      return {
        type: "message",
        text: `Available commands:
• join
• discord
• profile
• divisions
• origins
• lore`,
      };

    default:
      return { type: "ai" };
  }
}
