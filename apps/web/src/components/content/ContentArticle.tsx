import { JsonLd } from '@/components/JsonLd';
import { Panel } from '@/components/ui/panel';
import type { Block, ContentPage, Section } from '@/content/types';
import { contentPageGraph } from '@/lib/seo';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import React from 'react';
import { RichText } from './RichText';

/** Router paths are a typed union; authored content is strings. */
type AnyPath = never;

const prose = 'text-text/70 leading-relaxed';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const BlockView: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.kind) {
    case 'p':
      return (
        <p className={`${prose} mb-4 last:mb-0`}>
          <RichText text={block.text} />
        </p>
      );

    case 'list':
      return (
        <ul className={`${prose} space-y-2 mb-4 last:mb-0`}>
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2.5 size-1 rounded-full bg-accent shrink-0"
              />
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case 'steps':
      return (
        <ol className="space-y-4 mb-4 last:mb-0">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="mt-0.5 size-6 shrink-0 rounded-full bg-accent/[0.12] text-accent text-xs font-semibold flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium tracking-tight">
                  <RichText text={item.title} />
                </p>
                <p className={`${prose} text-[15px] mt-1`}>
                  <RichText text={item.text} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      );

    case 'stat':
      return (
        <div className="grid sm:grid-cols-3 gap-4 my-6">
          {block.items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-accent/15 bg-accent/[0.05] p-4"
            >
              <p className="text-xl font-bold tracking-tight">{item.value}</p>
              <p className="text-[13px] text-text/50 mt-1 leading-snug">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      );

    case 'note':
      return (
        <p
          className={`${prose} my-5 border-l-2 border-accent/40 pl-4 text-[15px]`}
        >
          <RichText text={block.text} />
        </p>
      );
  }
};

const SectionView: React.FC<{ section: Section }> = ({ section }) => (
  <section id={section.id} className="scroll-mt-24">
    <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
      {section.heading}
    </h2>
    {section.blocks.map((block, i) => (
      <BlockView key={i} block={block} />
    ))}
  </section>
);

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
 * visibly below — schema that doesn't match the page is a manual-action risk.
 */
export const ContentArticle: React.FC<ContentArticleProps> = ({
  page,
  trail,
  cta,
}) => {
  return (
    <div className="space-y-10">
      <JsonLd id="content" data={contentPageGraph(page, trail)} />

      <header className="space-y-3">
        {trail.length > 1 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[13px] text-text/40">
              {trail.slice(0, -1).map((crumb) => (
                <li key={crumb.path} className="flex items-center gap-2">
                  <Link
                    to={crumb.path as AnyPath}
                    className="hover:text-accent transition-colors"
                  >
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

      {page.faq?.length ? (
        <Panel
          title="Frequently asked questions"
          className="max-w-3xl"
          id="faq"
        >
          <div className="divide-y divide-line">
            {page.faq.map((item) => (
              <div key={item.q} className="py-4 first:pt-0 last:pb-0">
                <h3 className="font-medium tracking-tight">{item.q}</h3>
                <p className="text-sm text-text/50 mt-1.5 leading-relaxed">
                  <RichText text={item.a} />
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

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

      {page.related?.length ? (
        <section className="max-w-3xl">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text/35 mb-3">
            Keep reading
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {page.related.map((item) => (
              <Link
                key={item.to}
                to={item.to as AnyPath}
                className="rounded-xl border border-accent/15 bg-accent/[0.05] p-4 hover:border-accent/30 transition-colors group"
              >
                <p className="font-medium tracking-tight text-sm flex items-center gap-1.5">
                  {item.label}
                  <ArrowRight className="size-3.5 text-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </p>
                <p className="text-[13px] text-text/45 mt-1 leading-snug">
                  {item.hint}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
