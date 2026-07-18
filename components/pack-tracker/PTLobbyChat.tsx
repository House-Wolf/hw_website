'use client'

import { useEffect, useRef, useState, useCallback, FormEvent } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Send, Wifi, WifiOff } from 'lucide-react'
import Image from 'next/image'

interface ChatUser {
  id: string
  discordDisplayName: string | null
  discordUsername: string
  avatarUrl: string | null
}

interface ChatMessage {
  id: string
  content: string
  createdAt: string
  author: ChatUser
}

interface Props {
  currentUserId: string
  initialMessages: ChatMessage[]
}

export default function PTLobbyChat({ currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const refreshMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/packtracker/chat?limit=100')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } catch {
      // network error — keep existing messages
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('pt-lobby-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pt_lobby_chat_messages' },
        () => refreshMessages()
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [supabase, refreshMessages])

  async function send(e: FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setInput('')
    try {
      await fetch('/api/packtracker/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{ background: 'var(--background-card)', borderColor: 'var(--border-default)', height: '600px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: 'var(--accent-primary)' }} />
          <span
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: 'var(--accent-primary)' }}
          >
            Lobby
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi size={14} style={{ color: '#4ADE80' }} />
          ) : (
            <WifiOff size={14} style={{ color: 'var(--text-muted)' }} />
          )}
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: connected ? '#4ADE80' : 'var(--text-muted)' }}
          >
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.author.id === currentUserId
          const name = msg.author.discordDisplayName ?? msg.author.discordUsername
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              {msg.author.avatarUrl ? (
                <Image
                  src={msg.author.avatarUrl}
                  alt={name}
                  width={28}
                  height={28}
                  className="rounded-full shrink-0 mt-0.5 object-cover"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(71,0,0,0.3)', color: 'var(--accent-primary)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isMe ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}
                  >
                    {isMe ? 'You' : name}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className="px-3 py-2 rounded-lg text-sm break-words"
                  style={{
                    background: isMe ? 'rgba(71,0,0,0.35)' : 'var(--background-elevated)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${isMe ? 'var(--border-crimson)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="px-4 py-3 border-t flex items-center gap-2 shrink-0"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(e as unknown as FormEvent)}
          placeholder="Message the lobby…"
          maxLength={2000}
          className="flex-1 bg-transparent text-sm outline-none placeholder-opacity-50"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex items-center justify-center w-8 h-8 rounded-md transition-all disabled:opacity-40"
          style={{ background: 'var(--accent-primary)', color: 'var(--text-primary)' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
