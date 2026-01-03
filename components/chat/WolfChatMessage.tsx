export default function WolfChatMessage({
  sender,
  text,
}: {
  sender: "bot" | "user";
  text: string;
}) {
  const isBot = sender === "bot";

  return (
    <div
      className={`
        whitespace-pre-line
        text-sm
        leading-snug
        ${isBot ? "text-[var(--foreground)]" : "text-[var(--accent-secondary)]"}
      `}
    >
      {isBot ? "> " : "$ "}
      {text}
    </div>
  );
}
