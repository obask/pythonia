import { createFileRoute } from '@tanstack/react-router'
import { getLesson } from '@/lib/lesson-vault'

export const Route = createFileRoute('/api/lessons/$slug')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const lesson = await getLesson(params.slug)

        if (!lesson) {
          return Response.json({ error: 'Урок не найден' }, { status: 404 })
        }

        return Response.json(lesson)
      },
    },
  },
})
