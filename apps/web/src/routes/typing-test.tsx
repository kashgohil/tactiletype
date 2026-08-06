import { TypingTestGuide } from '@/pages/TypingTestGuide';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/typing-test')({
  component: TypingTestGuide,
});
