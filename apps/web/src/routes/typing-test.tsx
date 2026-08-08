import { createFileRoute } from '@tanstack/react-router';
import { TypingTestGuide } from '@/pages/TypingTestGuide';

export const Route = createFileRoute('/typing-test')({
  component: TypingTestGuide,
});
