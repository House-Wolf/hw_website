import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getChatMessages, createChatMessage } from '@/lib/packtracker/chat'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200)

  const messages = await getChatMessages(limit)
  return NextResponse.json({ messages })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const content = (body.content ?? '').trim()
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
  }

  const message = await createChatMessage(session.user.id, content)
  return NextResponse.json({ message }, { status: 201 })
}
