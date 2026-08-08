import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type React from 'react';
import { JsonLd } from '@/components/JsonLd';
import { GUIDES, guideSlug } from '@/content/registry';
import { absoluteUrl, breadcrumbSchema, WEBSITE_ID, webPageSchema } from '@/lib/seo';

const meta = {
  path: '/guides',
  title: 'Typing Guides — Speed, Accuracy & Practice | tactiletype',
  description:
    'Plain-language guides to typing: what WPM measures, how to actually get faster, why accuracy wins, and how code typing differs from prose.',
};

/** Hub for the guide cluster — exists to pass authority down to the guides. */
export const Guides: React.FC = () => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      webPageSchema(meta),
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Guides', path: '/guides' },
      ]),
      {
        '@type': 'ItemList',
        '@id': `${absoluteUrl('/guides')}#list`,
        isPartOf: { '@id': WEBSITE_ID },
        itemListElement: GUIDES.map((guide, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: guide.h1,
          url: absoluteUrl(guide.path),
        })),
      },
    ],
  };

  return (
    <div className="space-y-10">
      <JsonLd id="content" data={graph} />

      <header className="space-y-2.5">
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Typing guides
        </h1>
        <p className="text-[17px] text-text/60 max-w-3xl leading-relaxed">
          What the numbers mean, what actually makes you faster, and what to ignore. Written to be
          read once and acted on — not to fill a page.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {GUIDES.map((guide) => (
          <Link
            key={guide.path}
            to="/guides/$slug"
            params={{ slug: guideSlug(guide) }}
            className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-5 hover:border-accent/30 transition-colors group flex flex-col"
          >
            <h2 className="font-semibold tracking-tight flex items-center gap-2">
              {guide.h1}
              <ArrowRight className="size-4 text-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h2>
            <p className="text-sm text-text/50 mt-2 leading-relaxed grow">{guide.description}</p>
            <p className="text-xs text-text/30 mt-4">
              Updated{' '}
              <time dateTime={guide.updated}>
                {new Date(`${guide.updated}T00:00:00Z`).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
            </p>
          </Link>
        ))}
      </div>

      <section className="max-w-3xl">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text/35 mb-3">
          Start typing instead
        </h2>
        <p className="text-text/70 leading-relaxed">
          Reading about typing has a low ceiling.{' '}
          <Link to="/" className="text-accent underline-offset-2 hover:underline">
            Take the test
          </Link>{' '}
          to get a number,{' '}
          <Link to="/practice" className="text-accent underline-offset-2 hover:underline">
            drill your weak spots
          </Link>{' '}
          to move it, or{' '}
          <Link to="/typing-test" className="text-accent underline-offset-2 hover:underline">
            read how the test works
          </Link>{' '}
          first.
        </p>
      </section>
    </div>
  );
};
