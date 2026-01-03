type ChatOption = {
  label: string;
  message: string;
};

export default function WolfChatOptions({
  options,
  onPick,
}: {
  options: ChatOption[];
  onPick: (opt: ChatOption) => void;
}) {
  return (
    <div className="border-t border-[var(--border-soft)] p-2 flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onPick(opt)}
          className="
            px-3 py-1
            rounded-md
            text-xs
            border border-[var(--border-soft)]
            bg-[var(--background-secondary)]
            hover:bg-[var(--background-soft)]
            text-[var(--foreground)]
          "
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
