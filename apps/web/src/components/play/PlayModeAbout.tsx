import type React from 'react';
import { FaqPanel, RelatedCards, SectionView } from '@/components/content/Blocks';
import { RichText } from '@/components/content/RichText';
import { JsonLd } from '@/components/JsonLd';
import type { PlayModePage } from '@/content/play-modes';
import { playModeGraph, playModeTrail } from '@/lib/seo';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The written half of a `/play/:mode` page: what the mode is, how it works,
 * and what it trains, rendered under the game itself.
 *
 * It starts at H2 on purpose. `PlayShell` already owns the page's single H1
 * with the mode's name, so this section slots beneath it rather than competing
 * with it, and the heading order a crawler walks stays H1 then H2.
 */
export const PlayModeAbout: React.FC<{ page: PlayModePage; h1: string }> = ({ page, h1 }) => (
  <section className="mt-14 pt-10 border-t border-line space-y-8">
    <JsonLd id="play-mode" data={playModeGraph(page, playModeTrail(page, h1))} />

    <div className="max-w-3xl space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">About {h1}</h2>
      {/* The answer-first paragraph, in the same slot the guides put theirs. */}
      <p className="text-[17px] text-text/60 leading-relaxed">
        <RichText text={page.intro} />
      </p>
      <p className="text-xs text-text/35">
        Updated <time dateTime={page.updated}>{formatDate(page.updated)}</time>
      </p>
    </div>

    <div className="space-y-8 max-w-3xl">
      {page.sections.map((section) => (
        <SectionView key={section.id} section={section} />
      ))}
    </div>

    <FaqPanel items={page.faq} />

    <RelatedCards items={page.related} heading="Related" />
  </section>
);
