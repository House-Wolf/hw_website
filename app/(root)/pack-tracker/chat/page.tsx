import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getChatMessages } from '@/lib/packtracker/chat'
import PTLobbyChat from '@/components/pack-tracker/PTLobbyChat'
import { MessageSquare } from 'lucide-react'

export const metadata = { title: 'Lobby Chat — PackTracker' }

export default async function LobbyChatPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const rawMessages = await getChatMessages(100)

  const messages = rawMessages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    author: m.author,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center border"
          style={{ background: 'rgba(71,0,0,0.15)', borderColor: 'var(--border-crimson)' }}
        >
          <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold uppercase tracking-widest"
            style={{ color: 'var(--accent-primary)' }}
          >
            Lobby Chat
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Real-time ops communication
          </p>
        </div>
      </div>

      <PTLobbyChat currentUserId={session.user.id} initialMessages={messages} />
    </div>
  )
}
