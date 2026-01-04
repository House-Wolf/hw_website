"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import WolfChatMessage from "@/components/chat/WolfChatMessage";
import WolfChatOptions from "@/components/chat/WolfChatOptions";
import WolfChatTyping from "@/components/chat/WolfChatTyping";
import WolfChatInput from "@/components/chat/WolfChatInput";

import { INITIAL_GREETING, INITIAL_OPTIONS } from "@/lib/chat/scriptedFlows";
import { LORE_RESPONSES } from "@/lib/chat/loreResponses";
import type { LoreTopic, Msg } from "@/lib/chat/types";
import { routeWolfCommand } from "@/lib/chat/commandRouter";

export default function WolfChatWindow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const hasInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(INITIAL_OPTIONS);

  /* ----------------------------------
     Auto-scroll
  ---------------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const addMessage = (msg: Msg) => setMessages((prev) => [...prev, msg]);

  /* ----------------------------------
     Initial greeting
  ---------------------------------- */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let i = 0;
    const typeNext = () => {
      if (INITIAL_GREETING[i]) {
        addMessage({ sender: "bot", text: INITIAL_GREETING[i] });
      }
      i++;
      if (i < INITIAL_GREETING.length) {
        setTimeout(typeNext, 700);
      } else {
        setTyping(false);
        setShowOptions(true);
      }
    };

    typeNext();
  }, []);

  /* ----------------------------------
     Groq AI fallback
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
      addMessage({
        sender: "bot",
        text: data?.text ?? "Command unclear. Type `help`.",
      });
    } catch {
      addMessage({
        sender: "bot",
        text: "Wolf Command is offline. Try again shortly.",
      });
    } finally {
      setTyping(false);
    }
  };

  /* ----------------------------------
     MAIN HANDLER (BULLET-PROOF)
  ---------------------------------- */
  const handleUserInput = async (text: string) => {
    if (!text.trim()) return;

    addMessage({ sender: "user", text });
    setShowOptions(false);

    const result = routeWolfCommand(text);

    if (result.type === "navigate") {
      router.push(result.path);
      return;
    }

    if (result.type === "external") {
      addMessage({ sender: "bot", text: `Opening ${result.label}…` });
      window.open(result.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (result.type === "lore") {
      const lore = LORE_RESPONSES[result.topic];
      if (lore) addMessage({ sender: "bot", text: lore.join(" ") });
      return;
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

    // -----------------------------
    // GROQ AI (PRIMARY, NOT FALLBACK)
    // -----------------------------
    if (result.type === "ai") {
      setTyping(true);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: result.prompt }),
      });
      const data = await res.json();
      addMessage({ sender: "bot", text: data.text });
      setTyping(false);
      return;
    }
  };

  /* ----------------------------------
     Render
  ---------------------------------- */
  return (
    <div className="fixed bottom-5 right-5 w-[420px] max-w-[95vw] h-[80vh] bg-[var(--background-elevated)] border border-[var(--border-soft)] rounded-md shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs tracking-widest">HOUSE WOLF COMMAND</span>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 font-mono text-sm">
        {messages.map((m, i) => (
          <WolfChatMessage key={i} sender={m.sender} text={m.text} />
        ))}
        {typing && <WolfChatTyping />}
        <div ref={messagesEndRef} />
      </div>

      {showOptions && (
        <WolfChatOptions
          options={currentOptions}
          onPick={(opt) => handleUserInput(opt.message)}
        />
      )}

      <WolfChatInput disabled={typing} onSend={handleUserInput} />
    </div>
  );
}
