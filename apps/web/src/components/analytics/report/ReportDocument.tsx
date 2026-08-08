import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ReportMetric, ReportModel } from '@/utils/report/buildReport';
import { CONTENT_WIDTH_MM, PAGE_CONTENT_MM, packPages } from '@/utils/report/paginate';
import { CHART_ASPECT } from '@/utils/report/renderChartImage';

/**
 * The report, as sheets of paper.
 *
 * One component serves all three outputs - screen preview, the print source,
 * and the DOM serialised into a standalone HTML file - so what a user previews
 * is literally what they save. It draws only from the `report-*` palette (see
 * the note in index.css); no accent, no theme surfaces.
 *
 * Pagination is done here rather than left to the browser because a running
 * footer needs a page number, and CSS cannot supply one: `@page` margin boxes
 * and `counter(page)` are specified but implemented by no major browser, and a
 * fixed-position footer has no idea which page it landed on. So the content is
 * measured once and packed into explicit page boxes.
 */

const EYEBROW = 'text-[0.6875rem] uppercase tracking-[0.16em] font-medium';

/**
 * Same mark the navbar uses. Left as an ordinary path: it resolves normally on
 * screen and in print, and the HTML export inlines every non-data `src` so a
 * saved file keeps it. The 256px source stays crisp printed at this size.
 */
const LOGO_SRC = '/tactiletype-256x256.png';

const Eyebrow: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <div className="flex items-center gap-2">
    <img
      src={LOGO_SRC}
      alt=""
      width={size === 'md' ? 20 : 14}
      height={size === 'md' ? 20 : 14}
      className={cn('shrink-0', size === 'md' ? 'size-5' : 'size-3.5')}
    />
    <span className={cn(EYEBROW, 'text-report-muted')}>TactileType · Performance report</span>
  </div>
);

/** Runs on every page after the first. */
const PageFooter: React.FC<{ page: number }> = ({ page }) => (
  <footer className="flex items-center justify-between gap-4 border-t border-report-rule pt-3">
    <Eyebrow size="sm" />
    <span className="text-[0.6875rem] tabular-nums text-report-muted">{page}</span>
  </footer>
);

const SectionHeading: React.FC<{ children: React.ReactNode; index: string }> = ({
  children,
  index,
}) => (
  <div className="flex items-baseline gap-3 border-b border-report-rule pb-2 mb-5">
    <span className={cn(EYEBROW, 'text-report-muted tabular-nums')}>{index}</span>
    <h2 className={cn(EYEBROW, 'text-report-ink')}>{children}</h2>
  </div>
);

const DeltaChip: React.FC<{ metric: ReportMetric }> = ({ metric }) => {
  const delta = metric.delta;
  if (!delta?.comparable) return null;

  const Icon =
    delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus;

  // A fall in a metric where higher is better is the only reading that should
  // alarm; everything else stays in ink so the page keeps one voice.
  const isLoss = delta.direction === 'down' && metric.higherIsBetter;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        delta.direction === 'flat'
          ? 'text-report-muted'
          : isLoss
            ? 'text-destructive'
            : 'text-success'
      )}
    >
      <Icon className="size-3" aria-hidden />
      {delta.direction === 'flat'
        ? 'level'
        : `${delta.percentage > 0 ? '+' : ''}${delta.percentage}%`}
    </span>
  );
};

const Keycap: React.FC<{ char: string; count: number }> = ({ char, count }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="size-10 rounded-md border border-report-rule bg-report-faint flex items-center justify-center text-base font-medium text-report-ink">
      {char === ' ' ? '␣' : char}
    </div>
    <span className="text-[0.625rem] tabular-nums text-report-muted">{count}</span>
  </div>
);

interface Block {
  key: string;
  node: React.ReactNode;
}

/**
 * The document as an ordered list of atomic pieces.
 *
 * A section heading is bundled with the first item it introduces, so a page
 * break can never strand a heading at the foot of a page.
 */
function buildBlocks(report: ReportModel): Block[] {
  const blocks: Block[] = [];
  let order = 0;
  const next = () => String(++order).padStart(2, '0');

  blocks.push({
    key: 'masthead',
    node: (
      <header className="mb-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Eyebrow />
          <span className="text-[0.6875rem] tabular-nums text-report-muted">
            {report.generatedAt}
          </span>
        </div>

        <h1 className="mt-4 text-4xl sm:text-[2.75rem] leading-[1.05] tracking-[-0.02em] font-semibold">
          {report.title}
        </h1>

        <p className="mt-2 text-sm tabular-nums text-report-muted">
          {report.rangeLabel} · {report.testCount} {report.testCount === 1 ? 'test' : 'tests'}{' '}
          recorded
        </p>

        {/* The heavy rule is the document's signature - it only appears here. */}
        <div className="mt-6 h-px bg-report-ink/70" />
      </header>
    ),
  });

  blocks.push({
    key: 'summary',
    node: (
      <section className="mb-11">
        <SectionHeading index={next()}>Executive summary</SectionHeading>
        <p className="max-w-[62ch] text-[1.0625rem] leading-[1.65] text-report-ink/85">
          {report.summary}
        </p>
      </section>
    ),
  });

  blocks.push({
    key: 'metrics',
    node: (
      <section className="mb-11">
        <SectionHeading index={next()}>Performance overview</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 divide-report-rule sm:divide-x">
          {report.metrics.map((metric, i) => (
            <div
              key={metric.key}
              className={cn(
                'flex flex-col gap-1',
                i > 0 && 'sm:pl-5',
                i < report.metrics.length - 1 && 'sm:pr-5'
              )}
            >
              <span className={cn(EYEBROW, 'text-report-muted')}>{metric.label}</span>
              <span className="text-[2rem] leading-none font-semibold tabular-nums tracking-[-0.02em]">
                {metric.value}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <DeltaChip metric={metric} />
                {metric.caption && (
                  <span className="text-[0.6875rem] text-report-muted">{metric.caption}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
  });

  if (report.charts.length > 0) {
    const heading = <SectionHeading index={next()}>Progress &amp; trends</SectionHeading>;
    report.charts.forEach((chart, i) => {
      blocks.push({
        key: `chart-${chart.type}`,
        node: (
          <section className="mb-8">
            {i === 0 && heading}
            <figure>
              <figcaption className="flex items-baseline justify-between gap-3 mb-3">
                <span className="text-sm font-medium">{chart.title}</span>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    Math.abs(chart.trendPercentage) < 1
                      ? 'text-report-muted'
                      : chart.trendPercentage > 0
                        ? 'text-success'
                        : 'text-destructive'
                  )}
                >
                  {chart.trendPercentage > 0 ? '+' : ''}
                  {chart.trendPercentage}%
                </span>
              </figcaption>
              {chart.image ? (
                <img
                  src={chart.image}
                  alt={`${chart.title} over ${report.rangeLabel}`}
                  className="w-full"
                  // Reserves the height before decode, so pagination measures
                  // the real block size rather than zero.
                  style={{ aspectRatio: CHART_ASPECT }}
                />
              ) : null}
              <p className="mt-2 text-xs text-report-muted">{chart.caption}</p>
            </figure>
          </section>
        ),
      });
    });
  }

  if (report.stats.length > 0) {
    blocks.push({
      key: 'stats',
      node: (
        <section className="mb-11">
          <SectionHeading index={next()}>Detailed statistics</SectionHeading>
          <dl className="grid sm:grid-cols-2 gap-x-10">
            {report.stats.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-report-rule py-2"
              >
                <dt className="text-sm text-report-muted">{row.label}</dt>
                <dd className="text-sm font-medium tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ),
    });
  }

  if (report.errorAnalysis && report.errorAnalysis.mostProblematicChars.length > 0) {
    const analysis = report.errorAnalysis;
    blocks.push({
      key: 'errors',
      node: (
        <section className="mb-11">
          <SectionHeading index={next()}>Error analysis</SectionHeading>
          {/* Scope stated plainly: this comes from the server across all
              history, unlike every figure above it. */}
          <p className="text-xs text-report-muted mb-4">
            Measured across your full history, not just this period.
          </p>
          <div className="flex flex-wrap gap-3 mb-6">
            {analysis.mostProblematicChars.slice(0, 12).map((char) => (
              <Keycap key={char.character} char={char.character} count={char.errorCount} />
            ))}
          </div>
          {analysis.improvementAreas.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {analysis.improvementAreas.slice(0, 4).map((area) => (
                <li key={area} className="text-sm text-report-ink/80 flex gap-2">
                  <span className="text-report-muted">-</span>
                  {area}
                </li>
              ))}
            </ul>
          )}
        </section>
      ),
    });
  }

  if (report.recommendations.length > 0) {
    const heading = <SectionHeading index={next()}>Recommendations</SectionHeading>;
    report.recommendations.slice(0, 5).forEach((rec, i) => {
      blocks.push({
        key: `rec-${rec.id}`,
        node: (
          <section className="mb-5">
            {i === 0 && heading}
            <div className="flex gap-4">
              <span className="text-lg font-semibold tabular-nums text-report-rule shrink-0 leading-tight">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-sm text-report-muted leading-relaxed mt-0.5">
                  {rec.description}
                </p>
              </div>
            </div>
          </section>
        ),
      });
    });
  }

  blocks.push({
    key: 'closing',
    node: (
      <section>
        <SectionHeading index={next()}>Conclusion</SectionHeading>
        <p className="max-w-[62ch] text-sm leading-[1.7] text-report-ink/85">{report.closing}</p>
      </section>
    ),
  });

  return blocks;
}

interface ReportDocumentProps {
  report: ReportModel;
  className?: string;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({ report, className }) => {
  const blocks = buildBlocks(report);
  const measure = useRef<HTMLDivElement>(null);
  // Carries the block count it was packed from. Toggling a section re-renders
  // with a shorter list one frame before the layout effect repacks, and page
  // indexes from the longer list would point at blocks that no longer exist.
  const [layout, setLayout] = useState<{
    blockCount: number;
    pages: number[][];
  } | null>(null);

  useLayoutEffect(() => {
    const root = measure.current;
    if (!root) return;
    let cancelled = false;

    let attempts = 0;

    const remeasure = () => {
      // Self-calibrating rather than assuming 96dpi: the measurer is declared
      // in millimetres, so its own pixel width gives the conversion.
      const pxPerMm = root.offsetWidth / CONTENT_WIDTH_MM;

      // Zero means no layout yet — detached, or in a display:none subtree.
      // Silently giving up here is what produced a single unpaginated page with
      // no footers, so keep asking for a few frames instead.
      if (!pxPerMm) {
        if (attempts++ < 10 && !cancelled) requestAnimationFrame(remeasure);
        return;
      }

      const footer = root.querySelector<HTMLElement>('[data-measure-footer]');
      const heights = Array.from(root.querySelectorAll<HTMLElement>('[data-measure-block]')).map(
        (element) => element.offsetHeight
      );

      if (!heights.length) return;
      setLayout({
        blockCount: heights.length,
        pages: packPages(heights, PAGE_CONTENT_MM * pxPerMm, footer?.offsetHeight ?? 0),
      });
    };

    remeasure();

    // Charts carry an aspect ratio so they measure correctly before decoding,
    // but the logo does not, and a font swapping in shifts every block. One
    // more pass once everything has settled costs nothing and catches both.
    Promise.all(
      Array.from(root.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined))
    ).then(() => {
      if (!cancelled) remeasure();
    });

    return () => {
      cancelled = true;
    };
    // Re-measures whenever the report changes: a toggled section, a new period.
  }, [report]);

  // A layout packed from a different set of blocks is stale by definition; one
  // unpaginated page is the right thing to show for the frame it takes the
  // effect to repack.
  const laidOut = layout?.blockCount === blocks.length ? layout.pages : [blocks.map((_, i) => i)];

  return (
    <>
      {/* Off-screen twin used only for measurement. Deliberately outside
          `data-report-sheet`: the HTML export serialises that element, and a
          hidden duplicate of the whole report would be carried into the file.
          `flow-root` on each wrapper stops block margins collapsing out of the
          measurement, so these heights match the real pages exactly. */}
      <div
        ref={measure}
        aria-hidden
        className="absolute -left-[10000px] top-0 invisible"
        style={{ width: `${CONTENT_WIDTH_MM}mm` }}
      >
        <div data-measure-footer className="flow-root">
          <PageFooter page={8} />
        </div>
        {blocks.map((block) => (
          <div key={block.key} data-measure-block className="flow-root">
            {block.node}
          </div>
        ))}
      </div>

      <div data-report-sheet className={cn('flex flex-col gap-6 print:gap-0', className)}>
        {laidOut.map((indexes, page) => (
          <article
            key={page}
            data-report-page
            className={cn(
              'bg-report-paper text-report-ink font-saira',
              // Padding in millimetres, matching the @page margins in
              // index.css, so screen and print share a measure.
              'w-full h-[297mm] px-[14mm] py-[16mm] flex flex-col',
              'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.18)]',
              // In print the page box supplies the margins, so the sheet adds
              // none and stands exactly one content-box tall.
              'print:h-[264mm] print:p-0 print:shadow-none',
              page < laidOut.length - 1 && 'print:break-after-page'
            )}
          >
            <div className="flex-1 min-h-0">
              {indexes.map((i) => (
                <div key={blocks[i].key} className="flow-root">
                  {blocks[i].node}
                </div>
              ))}
            </div>
            {/* Page one carries the masthead instead. */}
            {page > 0 && <PageFooter page={page + 1} />}
          </article>
        ))}
      </div>
    </>
  );
};
