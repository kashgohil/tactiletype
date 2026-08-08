import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type React from 'react';
import { Panel } from '@/components/ui/panel';
import type { Block, FaqItem, Section } from '@/content/types';
import { RichText } from './RichText';

/**
 * The rendering half of the authored-content model.
 *
 * Lives apart from `ContentArticle` because two page shapes now use it: the
 * guides, which are prose from the H1 down, and the `/play/:mode` pages, where
 * the same blocks sit underneath an interactive game. One renderer means a new
 * block kind appears everywhere at once, and the prerendered `<noscript>`
 * mirror only has one shape to match.
 */

/** Router paths are a typed union; authored content is strings. */
type AnyPath = never;

export const prose = 'text-text/70 leading-relaxed';

export const BlockView: React.FC<{ block: Block }> = ({ block }) => {
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
              <span aria-hidden className="mt-2.5 size-1 rounded-full bg-accent shrink-0" />
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
              <p className="text-[13px] text-text/50 mt-1 leading-snug">{item.label}</p>
            </div>
          ))}
        </div>
      );

    case 'note':
      return (
        <p className={`${prose} my-5 border-l-2 border-accent/40 pl-4 text-[15px]`}>
          <RichText text={block.text} />
        </p>
      );
  }
};

export const SectionView: React.FC<{ section: Section }> = ({ section }) => (
  <section id={section.id} className="scroll-mt-24">
    <h2 className="text-lg font-semibold tracking-tight text-text mb-3">{section.heading}</h2>
    {section.blocks.map((block, i) => (
      <BlockView key={i} block={block} />
    ))}
  </section>
);

/**
 * Rendered wherever `faqPageSchema` is emitted, and only there. Schema that
 * describes questions a visitor cannot see is a manual-action risk.
 */
export const FaqPanel: React.FC<{ items: FaqItem[]; className?: string }> = ({
  items,
  className = 'max-w-3xl',
}) => (
  <Panel title="Frequently asked questions" className={className} id="faq">
    <div className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.q} className="py-4 first:pt-0 last:pb-0">
          <h3 className="font-medium tracking-tight">{item.q}</h3>
          <p className="text-sm text-text/50 mt-1.5 leading-relaxed">
            <RichText text={item.a} />
          </p>
        </div>
      ))}
    </div>
  </Panel>
);

export const RelatedCards: React.FC<{
  items: { label: string; to: string; hint: string }[];
  heading?: string;
}> = ({ items, heading = 'Keep reading' }) => (
  <section className="max-w-3xl">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text/35 mb-3">
      {heading}
    </h2>
    <div className="grid sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to as AnyPath}
          className="rounded-xl border border-accent/15 bg-accent/[0.05] p-4 hover:border-accent/30 transition-colors group"
        >
          <p className="font-medium tracking-tight text-sm flex items-center gap-1.5">
            {item.label}
            <ArrowRight className="size-3.5 text-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </p>
          <p className="text-[13px] text-text/45 mt-1 leading-snug">{item.hint}</p>
        </Link>
      ))}
    </div>
  </section>
);
