'use client'

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Comment = {
  id: string;
  content: string;
  isLiveChat: boolean;
  createdAt: string;
  editedAt?: string | null;
  author: {
    id: string;
    discordDisplayName?: string | null;
    discordUsername: string;
    avatarUrl?: string | null;
  };
};

type Props = {
  comments: Comment[];
  currentUserId: string;
  requestType: "assistance" | "crafting" | "procurement";
  requestId: string;
  disabled?: boolean;
};

export default function PTRequestCommentThread({
  comments: initial,
  currentUserId,
  requestType,
  requestId,
  disabled = false,
}: Props) {
  const [comments, setComments] = useState(initial);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/packtracker/${requestType}/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", content: text }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setContent("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
        <MessageSquare size={14} style={{ color: "var(--accent-primary)" }} />
        Comments ({comments.length})
      </h3>

      <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
            No comments yet. Be the first to comment.
          </p>
        )}
        {comments.map((c) => {
          const isOwn = c.author.id === currentUserId;
          const name = c.author.discordDisplayName ?? c.author.discordUsername;
          return (
            <div key={c.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
              {c.author.avatarUrl ? (
                <Image
                  src={c.author.avatarUrl}
                  alt={name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(71,0,0,0.4)", color: "var(--accent-primary)" }}>
                  {name[0].toUpperCase()}
                </div>
              )}
              <div className={`flex-1 min-w-0 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: isOwn ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                    {name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div
                  className="px-3 py-2 rounded-lg text-sm max-w-[85%]"
                  style={{
                    background: isOwn ? "rgba(71,0,0,0.25)" : "var(--background-elevated)",
                    border: `1px solid ${isOwn ? "var(--border-crimson)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                  }}>
                  {c.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!disabled && (
        <form onSubmit={submit} className="flex gap-2 mt-1">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); } }}
            placeholder="Add a comment…"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "var(--background-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "var(--accent-primary)", color: "var(--text-primary)" }}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
