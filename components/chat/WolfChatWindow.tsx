"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import WolfChatMessage from "@/components/chat/WolfChatMessage";
import WolfChatOptions from "@/components/chat/WolfChatOptions";
import WolfChatTyping from "@/components/chat/WolfChatTyping";
import WolfChatInput from "@/components/chat/WolfChatInput";

import { INITIAL_GREETING, INITIAL_OPTIONS } from "@/lib/chat/scriptedFlows";
import { LORE_RESPONSES } from "@/lib/chat/loreResponses";
import { routeWolfCommand } from "@/lib/chat/commandRouter";

type Msg = {
  sender: "bot" | "user";
  text: string;
};

export default function WolfChatWindow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const hasInitialized = useRef(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  /* ----------------------------------
     Helpers
  ---------------------------------- */
  const addMessage = (msg: Msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  /* ----------------------------------
     Initial greeting (typed once)
  ---------------------------------- */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!INITIAL_GREETING.length) {
      setTyping(false);
      setShowOptions(true);
      return;
    }

    let i = 0;

    const typeNext = () => {
      const line = INITIAL_GREETING[i];
      if (line) {
        addMessage({ sender: "bot", text: line });
      }

      i++;

      if (i < INITIAL_GREETING.length) {
        setTimeout(typeNext, 700);
      } else {
        setTimeout(() => {
          setTyping(false);
          setShowOptions(true);
        }, 400);
      }
    };

    typeNext();
  }, []);

  /* ----------------------------------
     AI fallback (Groq-ready)
  ---------------------------------- */
  const sendToAI = async (text: string) => {
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data?.text) {
        addMessage({ sender: "bot", text: data.text });
      } else {
        addMessage({
          sender: "bot",
          text: "Command unclear. Type `help` for available actions.",
        });
      }
    } catch (err) {
      addMessage({
        sender: "bot",
        text: "Wolf Command is offline. Try again shortly.",
      });
    } finally {
      setTyping(false);
    }
  };

  /* ----------------------------------
     Main input handler
  ---------------------------------- */
 const handleUserInput = async (text: string) => {
  if (!text.trim()) return;

  addMessage({ sender: "user", text });
  setShowOptions(false);

  const result = routeWolfCommand(text);

  if (result.type === "navigate") {
    addMessage({
      sender: "bot",
      text: "Understood. Redirecting now.",
    });
    setTimeout(() => router.push(result.path), 600);
    return;
  }

  if (result.type === "external") {
    addMessage({
      sender: "bot",
      text: `You can access ${result.label} here:\n${result.url}`,
    });
    return;
  }

  if (result.type === "lore") {
    const lore = LORE_RESPONSES[result.topic];
    if (lore) {
      addMessage({ sender: "bot", text: lore });
      return;
    }
  }

  if (result.type === "message") {
    addMessage({ sender: "bot", text: result.text });
    return;
  }

  // AI fallback
  await sendToAI(text);
};


  /* ----------------------------------
     Render
  ---------------------------------- */
  return (
    <div
      className="
        fixed bottom-5 right-5 z-50
        w-[360px] max-w-[95vw]
        border border-[var(--border-soft)]
        bg-[var(--background-elevated)]
        rounded-md
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
        <span className="text-xs tracking-widest text-[var(--foreground-muted)]">
          HOUSE WOLF COMMAND
        </span>
        <button
          onClick={onClose}
          className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto px-3 py-2 font-mono text-sm space-y-2">
        {messages.map((m, i) => (
          <WolfChatMessage key={i} sender={m.sender} text={m.text} />
        ))}
        {typing && <WolfChatTyping />}
      </div>

      {/* Options */}
      {showOptions && (
        <WolfChatOptions
          options={INITIAL_OPTIONS}
          onPick={(opt) => handleUserInput(opt.message)}
        />
      )}

      {/* Input */}
      <WolfChatInput disabled={typing} onSend={handleUserInput} />
    </div>
  );
}
