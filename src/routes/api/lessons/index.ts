import { createFileRoute } from '@tanstack/react-router'
import { getLessons } from '@/lib/lesson-vault'

export const Route = createFileRoute('/api/lessons/')({
  server: {
    handlers: {
      GET: async () => {
        const lessons = await getLessons()
        return Response.json(lessons)
      },
    },
  },
})
