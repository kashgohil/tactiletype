import { Link } from '@tanstack/react-router';
import type React from 'react';
import { JsonLd } from '@/components/JsonLd';
import type { ContentPage } from '@/content/types';
import { contentPageGraph } from '@/lib/seo';
import { FaqPanel, RelatedCards, SectionView } from './Blocks';
import { RichText } from './RichText';

/** Router paths are a typed union; authored content is strings. */
type AnyPath = never;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface ContentArticleProps {
  page: ContentPage;
  /** Schema breadcrumb trail; also rendered as a visible crumb row. */
  trail: { name: string; path: string }[];
  /** Optional call-to-action rendered directly under the intro. */
  cta?: React.ReactNode;
}

/**
 * Renders a data-authored content page: prose, FAQ, citations, and the full
 * JSON-LD graph (WebPage + Article + BreadcrumbList + FAQPage).
 *
 * The FAQ markup is emitted only because the questions are also rendered
 * visibly below - schema that doesn't match the page is a manual-action risk.
 */
export const ContentArticle: React.FC<ContentArticleProps> = ({ page, trail, cta }) => {
  return (
    <div className="space-y-10">
      <JsonLd id="content" data={contentPageGraph(page, trail)} />

      <header className="space-y-3">
        {trail.length > 1 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[13px] text-text/40">
              {trail.slice(0, -1).map((crumb) => (
                <li key={crumb.path} className="flex items-center gap-2">
                  <Link to={crumb.path as AnyPath} className="hover:text-accent transition-colors">
                    {crumb.name}
                  </Link>
                  <span aria-hidden>/</span>
                </li>
              ))}
              <li className="text-text/60">{trail.at(-1)?.name}</li>
            </ol>
          </nav>
        )}

        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          {page.h1}
        </h1>

        {/* The answer-first paragraph. Answer engines quote this more than
            anything else on the page, so it reads as a standalone answer. */}
        <p className="text-[17px] text-text/60 max-w-3xl leading-relaxed">
          <RichText text={page.intro} />
        </p>

        <p className="text-xs text-text/35">
          Updated <time dateTime={page.updated}>{formatDate(page.updated)}</time>
        </p>

        {cta}
      </header>

      {page.sections.length > 1 && (
        <nav aria-label="On this page" className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text/35 mb-2.5">
            On this page
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {page.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-text/55 hover:text-accent transition-colors"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-8 max-w-3xl">
        {page.sections.map((section) => (
          <SectionView key={section.id} section={section} />
        ))}
      </div>

      {page.faq?.length ? <FaqPanel items={page.faq} /> : null}

      {page.sources?.length ? (
        <section className="max-w-3xl" id="sources">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text/35 mb-2.5">
            Sources
          </h2>
          <ul className="space-y-1.5">
            {page.sources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text/50 hover:text-accent transition-colors underline-offset-2 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {page.related?.length ? <RelatedCards items={page.related} /> : null}
    </div>
  );
};
