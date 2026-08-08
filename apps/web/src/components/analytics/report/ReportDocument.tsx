import { cn } from '@/lib/utils';
import type { ReportMetric, ReportModel } from '@/utils/report/buildReport';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

/**
 * The report, as a sheet of paper.
 *
 * One component serves all three outputs — screen preview, the print source,
 * and the DOM that gets serialised into a standalone HTML file — so what a user
 * previews is literally what they save. It draws only from the `report-*`
 * palette (see the note in index.css); no accent, no theme surfaces.
 */

const EYEBROW = 'text-[0.6875rem] uppercase tracking-[0.16em] font-medium';

const SectionHeading: React.FC<{ children: React.ReactNode; index: string }> = ({
  children,
  index,
}) => (
  <div className="flex items-baseline gap-3 border-b border-report-rule pb-2 mb-5">
    <span className={cn(EYEBROW, 'text-report-muted tabular-nums')}>
      {index}
    </span>
    <h2 className={cn(EYEBROW, 'text-report-ink')}>{children}</h2>
  </div>
);

const DeltaChip: React.FC<{ metric: ReportMetric }> = ({ metric }) => {
  const delta = metric.delta;
  if (!delta?.comparable) return null;

  const Icon =
    delta.direction === 'up'
      ? TrendingUp
      : delta.direction === 'down'
        ? TrendingDown
        : Minus;

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
  <div className="flex flex-col items-center gap-1.5" data-report-block>
    <div className="size-10 rounded-md border border-report-rule bg-report-faint flex items-center justify-center text-base font-medium text-report-ink">
      {char === ' ' ? '␣' : char}
    </div>
    <span className="text-[0.625rem] tabular-nums text-report-muted">
      {count}
    </span>
  </div>
);

interface ReportDocumentProps {
  report: ReportModel;
  className?: string;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({
  report,
  className,
}) => {
  // Numbered so the printed document reads as a document, and so a section
  // switched off in the config doesn't leave a gap in the sequence.
  let order = 0;
  const next = () => String(++order).padStart(2, '0');

  return (
    <article
      data-report-sheet
      className={cn(
        'bg-report-paper text-report-ink font-saira',
        'mx-auto w-full max-w-[52rem] rounded-lg p-8 sm:p-12',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.18)]',
        'print:max-w-none print:rounded-none print:p-0 print:shadow-none',
        className
      )}
    >
      {/* Masthead */}
      <header className="mb-10" data-report-block>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <span className={cn(EYEBROW, 'text-report-muted')}>
            TactileType · Performance report
          </span>
          <span className="text-[0.6875rem] tabular-nums text-report-muted">
            {report.generatedAt}
          </span>
        </div>

        <h1 className="mt-4 text-4xl sm:text-[2.75rem] leading-[1.05] tracking-[-0.02em] font-semibold">
          {report.title}
        </h1>

        <p className="mt-2 text-sm tabular-nums text-report-muted">
          {report.rangeLabel} · {report.testCount}{' '}
          {report.testCount === 1 ? 'test' : 'tests'} recorded
        </p>

        {/* The heavy rule is the document's signature — it only appears here. */}
        <div className="mt-6 h-px bg-report-ink/70" />
      </header>

      {/* Standfirst */}
      <section className="mb-11" data-report-section>
        <SectionHeading index={next()}>Executive summary</SectionHeading>
        <p className="max-w-[62ch] text-[1.0625rem] leading-[1.65] text-report-ink/85">
          {report.summary}
        </p>
      </section>

      {/* Headline metrics */}
      <section className="mb-11" data-report-section>
        <SectionHeading index={next()}>Performance overview</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 divide-report-rule sm:divide-x">
          {report.metrics.map((metric, i) => (
            <div
              key={metric.key}
              data-report-block
              className={cn(
                'flex flex-col gap-1',
                i > 0 && 'sm:pl-5',
                i < report.metrics.length - 1 && 'sm:pr-5'
              )}
            >
              <span className={cn(EYEBROW, 'text-report-muted')}>
                {metric.label}
              </span>
              <span className="text-[2rem] leading-none font-semibold tabular-nums tracking-[-0.02em]">
                {metric.value}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <DeltaChip metric={metric} />
                {metric.caption && (
                  <span className="text-[0.6875rem] text-report-muted">
                    {metric.caption}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts */}
      {report.charts.length > 0 && (
        <section className="mb-11" data-report-section>
          <SectionHeading index={next()}>Progress &amp; trends</SectionHeading>
          <div className="flex flex-col gap-8">
            {report.charts.map((chart) => (
              <figure key={chart.type} data-report-block>
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
                  />
                ) : null}
                <p className="mt-2 text-xs text-report-muted">{chart.caption}</p>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Detailed statistics */}
      {report.stats.length > 0 && (
        <section className="mb-11" data-report-section>
          <SectionHeading index={next()}>Detailed statistics</SectionHeading>
          <dl className="grid sm:grid-cols-2 gap-x-10">
            {report.stats.map((row) => (
              <div
                key={row.label}
                data-report-block
                className="flex items-baseline justify-between gap-4 border-b border-report-rule py-2"
              >
                <dt className="text-sm text-report-muted">{row.label}</dt>
                <dd className="text-sm font-medium tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Error analysis */}
      {report.errorAnalysis &&
        report.errorAnalysis.mostProblematicChars.length > 0 && (
          <section className="mb-11" data-report-section>
            <SectionHeading index={next()}>Error analysis</SectionHeading>
            {/* Scope stated plainly: this comes from the server across all
                history, unlike every figure above it. */}
            <p className="text-xs text-report-muted mb-4">
              Measured across your full history, not just this period.
            </p>
            <div className="flex flex-wrap gap-3 mb-6" data-report-block>
              {report.errorAnalysis.mostProblematicChars
                .slice(0, 12)
                .map((char) => (
                  <Keycap
                    key={char.character}
                    char={char.character}
                    count={char.errorCount}
                  />
                ))}
            </div>
            {report.errorAnalysis.improvementAreas.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {report.errorAnalysis.improvementAreas
                  .slice(0, 4)
                  .map((area) => (
                    <li
                      key={area}
                      className="text-sm text-report-ink/80 flex gap-2"
                    >
                      <span className="text-report-muted">—</span>
                      {area}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <section className="mb-11" data-report-section>
          <SectionHeading index={next()}>Recommendations</SectionHeading>
          <ol className="flex flex-col gap-5">
            {report.recommendations.slice(0, 5).map((rec, i) => (
              <li key={rec.id} className="flex gap-4" data-report-block>
                <span className="text-lg font-semibold tabular-nums text-report-rule shrink-0 leading-tight">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-sm text-report-muted leading-relaxed mt-0.5">
                    {rec.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Closing */}
      <section data-report-section data-report-block>
        <SectionHeading index={next()}>Conclusion</SectionHeading>
        <p className="max-w-[62ch] text-sm leading-[1.7] text-report-ink/85">
          {report.closing}
        </p>
        <div className="mt-8 pt-4 border-t border-report-rule flex items-baseline justify-between gap-4 flex-wrap">
          <span className={cn(EYEBROW, 'text-report-muted')}>
            Generated by TactileType
          </span>
          <span className="text-[0.6875rem] tabular-nums text-report-muted">
            {report.rangeLabel}
          </span>
        </div>
      </section>
    </article>
  );
};
