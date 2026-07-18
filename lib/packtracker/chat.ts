import 'server-only'
import { prisma } from '@/lib/prisma'

export async function getChatMessages(limit = 100) {
  return prisma.ptLobbyChatMessage.findMany({
    take: limit,
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: {
          id: true,
          discordDisplayName: true,
          discordUsername: true,
          avatarUrl: true,
        },
      },
    },
  })
}

export async function createChatMessage(authorId: string, content: string) {
  return prisma.ptLobbyChatMessage.create({
    data: { authorId, content },
    include: {
      author: {
        select: {
          id: true,
          discordDisplayName: true,
          discordUsername: true,
          avatarUrl: true,
        },
      },
    },
  })
}
