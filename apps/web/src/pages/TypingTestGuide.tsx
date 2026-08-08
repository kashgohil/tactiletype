import { Link } from '@tanstack/react-router';
import { Keyboard } from 'lucide-react';
import type React from 'react';
import { ContentArticle } from '@/components/content/ContentArticle';
import { Button } from '@/components/ui/button';
import { typingTestPage } from '@/content/typing-test';

/**
 * `/typing-test` — the explainer that feeds `/`.
 *
 * `/` owns the transactional "free typing test" query and holds every internal
 * link; this page takes the informational intent instead ("what is a typing
 * test", "how is WPM calculated") so the two don't compete for one result slot.
 */
export const TypingTestGuide: React.FC = () => (
  <ContentArticle
    page={typingTestPage}
    trail={[
      { name: 'Home', path: '/' },
      { name: 'Typing test explained', path: '/typing-test' },
    ]}
    cta={
      <div className="pt-2">
        <Button asChild size="lg">
          <Link to="/">
            <Keyboard className="size-4" />
            Take the test
          </Link>
        </Button>
      </div>
    }
  />
);
