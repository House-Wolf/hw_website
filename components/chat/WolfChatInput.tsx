import { useState } from "react";

export default function WolfChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSend(value);
        setValue("");
      }}
      className="flex border-t border-[var(--border-soft)]"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Type command…"
        className="
          flex-1 px-3 py-2 bg-transparent
          text-sm font-mono
          outline-none
        "
      />
    </form>
  );
}
