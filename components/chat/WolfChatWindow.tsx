"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import WolfChatMessage from "@/components/chat/WolfChatMessage";
import WolfChatOptions from "@/components/chat/WolfChatOptions";
import WolfChatTyping from "@/components/chat/WolfChatTyping";
import WolfChatInput from "@/components/chat/WolfChatInput";

import { INITIAL_GREETING, INITIAL_OPTIONS } from "@/lib/chat/scriptedFlows";
import { LORE_RESPONSES } from "@/lib/chat/loreResponses";
import type { LoreTopic } from "@/lib/chat/types";
import { routeWolfCommand } from "@/lib/chat/commandRouter";

type Msg = {
  sender: "bot" | "user";
  text: string;
};

export default function WolfChatWindow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const hasInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [actionButtons, setActionButtons] = useState<
    { label: string; url: string }[] | null
  >(null);
  const [activeLore, setActiveLore] = useState<LoreTopic | null>(null);
  const [loreIndex, setLoreIndex] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(INITIAL_OPTIONS);

  /* ----------------------------------
     Auto-scroll to bottom
  ---------------------------------- */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

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
    setActionButtons(null);

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
        text: `Opening ${result.label}...`,
      });
      setActionButtons([{ label: result.label, url: result.url }]);
      return;
    }

    if (result.type === "lore") {
      const lore = LORE_RESPONSES[result.topic];
      if (lore) {
        addMessage({ sender: "bot", text: lore.join(" ") });
        return;
      }
    }

    if (result.type === "options") {
      addMessage({ sender: "bot", text: result.text });
      setCurrentOptions(result.options);
      setShowOptions(true);
      return;
    }

    if (result.type === "message") {
      addMessage({ sender: "bot", text: result.text });
      return;
    }

    if (result.type === "ai") {
      // AI fallback
      await sendToAI(text);
      return;
    }

    // Unknown fallback
    addMessage({
      sender: "bot",
      text: "Command unclear. Type 'help' for available actions.",
    });
  };

  /* ----------------------------------
     Render
  ---------------------------------- */
  return (
    <div
      className="
        fixed z-50
        bottom-3 right-3
        sm:bottom-5 sm:right-5
        w-[calc(100vw-1.5rem)]
        sm:w-[380px]
        md:w-[420px]
        lg:w-[460px]
        max-w-[95vw]
        max-h-[calc(100vh-6rem)]
        sm:max-h-[calc(100vh-8rem)]
        md:max-h-[calc(100vh-10rem)]
        border border-[var(--border-soft)]
        bg-[var(--background-elevated)]
        rounded-md
        shadow-2xl
        flex flex-col
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
        <span className="text-xs sm:text-sm tracking-widest text-[var(--foreground-muted)]">
          HOUSE WOLF COMMAND
        </span>
        <button
          onClick={onClose}
          className="text-xs sm:text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-xs sm:text-sm space-y-2">
        {messages.map((m, i) => (
          <WolfChatMessage key={i} sender={m.sender} text={m.text} />
        ))}
        {typing && <WolfChatTyping />}
        <div ref={messagesEndRef} />
      </div>

      {/* Options */}
      {showOptions && (
        <WolfChatOptions
          options={currentOptions}
          onPick={(opt) => handleUserInput(opt.message)}
        />
      )}
      {actionButtons && (
        <div className="px-3 py-2 flex flex-col gap-2">
          {actionButtons.map((btn) => (
            <a
              key={btn.label}
              href={btn.url}
              target={btn.url.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="
          block text-center
          px-3 py-2
          rounded-md
          text-sm font-semibold
          bg-[var(--accent-strong)]
          text-white
          hover:bg-[var(--maroon-500)]
          transition-colors
        "
            >
              {btn.label}
            </a>
          ))}
        </div>
      )}

      {/* Input */}
      <WolfChatInput disabled={typing} onSend={handleUserInput} />
    </div>
  );
}
