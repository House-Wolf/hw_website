export type Sender = "bot" | "user";

export type Msg = {
  sender: Sender;
  text: string;
};

export type ChatOption = {
  label: string;
  message: string; // what to send back into the chat handler
  kind?: "primary" | "secondary";
};

export type LoreTopic = "house-wolf" | "kampos" | "dragoon-code";


export type CommandResult =
  | { type: "navigate"; path: string }
  | { type: "external"; label: string; url: string }
  | { type: "lore"; topic: LoreTopic }
  | { type: "message"; text: string }
  | { type: "ai"; text: string  };
