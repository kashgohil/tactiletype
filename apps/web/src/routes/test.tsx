import { createFileRoute } from '@tanstack/react-router'
import { TypingTest } from '../pages/TypingTest'

export const Route = createFileRoute('/test')({
  component: TypingTest,
})