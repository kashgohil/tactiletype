import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { ContentArticle } from '@/components/content/ContentArticle';
import { Button } from '@/components/ui/button';
import { getGuideBySlug } from '@/content/registry';

/** A single guide. Unknown slugs render a noindex-able not-found state. */
export const Guide: React.FC = () => {
  const { slug } = useParams({ from: '/guides/$slug' });
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return (
      <div className="grow flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Guide not found</h1>
        <p className="text-text/50 max-w-md leading-relaxed">
          That guide doesn't exist — it may have been renamed.
        </p>
        <Button asChild variant="outline">
          <Link to="/guides">
            <ArrowLeft className="size-4" />
            All guides
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ContentArticle
      page={guide}
      trail={[
        { name: 'Home', path: '/' },
        { name: 'Guides', path: '/guides' },
        { name: guide.h1, path: guide.path },
      ]}
    />
  );
};
