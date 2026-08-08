import type {
  ChartDataPoint,
  ErrorAnalysisSummary,
  ProgressChart,
  UserRecommendation,
} from '@tactile/types';
import type { ReportResultRow } from '@/services/analyticsApi';

export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';
export type ReportFormat = 'pdf' | 'html' | 'json';

/**
 * Rolling windows, not calendar ones — the picker says "Last Month", and a
 * calendar month would report two days of data when run on the 2nd.
 */
export const PERIOD_DAYS: Record<ReportPeriod, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

export const PERIOD_NAME: Record<ReportPeriod, string> = {
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Annual',
};

export interface ReportSections {
  charts: boolean;
  detailedStats: boolean;
  recommendations: boolean;
}

export interface ReportDelta {
  percentage: number;
  direction: 'up' | 'down' | 'flat';
  /** False when the prior window held no tests, so there is nothing to compare. */
  comparable: boolean;
}

export interface ReportMetric {
  key: string;
  label: string;
  value: string;
  caption?: string;
  delta?: ReportDelta;
  /** Decides whether a downward delta reads as progress or regression. */
  higherIsBetter: boolean;
}

export interface ReportChart {
  type: ProgressChart['type'];
  title: string;
  caption: string;
  points: ChartDataPoint[];
  trendPercentage: number;
  /** Filled in by renderChartImage; absent while previewing on screen. */
  image?: string;
}

export interface ReportStatRow {
  label: string;
  value: string;
}

export interface ReportModel {
  title: string;
  period: ReportPeriod;
  periodLabel: string;
  rangeLabel: string;
  generatedAt: string;
  /** Lead paragraph, written from the period's own numbers. */
  summary: string;
  metrics: ReportMetric[];
  charts: ReportChart[];
  stats: ReportStatRow[];
  /** Server-computed over all history, so the document labels it as such. */
  errorAnalysis?: ErrorAnalysisSummary;
  recommendations: UserRecommendation[];
  closing: string;
  testCount: number;
}

const DAY_MS = 86_400_000;

const mean = (values: number[]): number =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Rounds for display without pretending to precision the data lacks. */
const round1 = (n: number): number => Math.round(n * 10) / 10;

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.max(0, Math.round(seconds))}s`;
}

const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const shortDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function deltaBetween(current: number, previous: number): ReportDelta {
  if (!previous) return { percentage: 0, direction: 'flat', comparable: false };
  const percentage = round1(((current - previous) / previous) * 100);
  return {
    percentage,
    // Sub-1% swings are noise at these sample sizes; calling them a trend
    // would put an arrow on nothing.
    direction:
      Math.abs(percentage) < 1 ? 'flat' : percentage > 0 ? 'up' : 'down',
    comparable: true,
  };
}

function withinWindow(
  rows: ReportResultRow[],
  from: Date,
  to: Date
): ReportResultRow[] {
  return rows.filter((row) => {
    const at = new Date(row.date).getTime();
    return at >= from.getTime() && at < to.getTime();
  });
}

/** Mean of the first half against the second, which shrugs off single outliers. */
function trendOf(points: ChartDataPoint[]): number {
  if (points.length < 4) return 0;
  const mid = Math.floor(points.length / 2);
  const first = mean(points.slice(0, mid).map((p) => p.value));
  const second = mean(points.slice(mid).map((p) => p.value));
  if (!first) return 0;
  return round1(((second - first) / first) * 100);
}

const CHART_TITLES: Record<ProgressChart['type'], string> = {
  wpm: 'Typing speed',
  accuracy: 'Accuracy',
  consistency: 'Consistency',
  time_spent: 'Time practised',
};

const CHART_UNITS: Record<ProgressChart['type'], string> = {
  wpm: ' WPM',
  accuracy: '%',
  consistency: '%',
  time_spent: '',
};

function describeTrend(percentage: number, noun: string): string {
  if (Math.abs(percentage) < 1) return `${noun} held steady`;
  const verb = percentage > 0 ? 'rose' : 'fell';
  return `${noun} ${verb} ${Math.abs(percentage).toFixed(1)}%`;
}

/**
 * Writes the standfirst. Reads as a sentence rather than a stat dump, because
 * this is the one part of the report a reader will not skim past.
 */
function writeSummary(
  rows: ReportResultRow[],
  previous: ReportResultRow[],
  periodDays: number,
  wpmDelta: ReportDelta
): string {
  const avgWpm = Math.round(mean(rows.map((r) => r.wpm)));
  const avgAccuracy = round1(mean(rows.map((r) => r.accuracy)));
  const timeAtKeyboard = rows.reduce((a, r) => a + r.timeTaken, 0);

  const opening = `Across ${rows.length} ${
    rows.length === 1 ? 'test' : 'tests'
  } in the last ${periodDays} days you averaged ${avgWpm} WPM at ${avgAccuracy}% accuracy, over ${formatDuration(
    timeAtKeyboard
  )} at the keyboard.`;

  if (!previous.length) {
    return `${opening} This is your first stretch of practice in this window, so there is nothing yet to compare it against - the next report will show movement.`;
  }

  const prevWpm = Math.round(mean(previous.map((r) => r.wpm)));
  if (!wpmDelta.comparable || wpmDelta.direction === 'flat') {
    return `${opening} That holds level with the ${prevWpm} WPM you averaged over the preceding ${periodDays} days - steady ground to push from.`;
  }

  const movement = wpmDelta.direction === 'up' ? 'up' : 'down';
  return `${opening} That is ${movement} ${Math.abs(wpmDelta.percentage).toFixed(
    1
  )}% on the ${prevWpm} WPM you averaged over the preceding ${periodDays} days.`;
}

function writeClosing(rows: ReportResultRow[], wpmDelta: ReportDelta): string {
  const best = Math.max(...rows.map((r) => r.wpm));
  if (wpmDelta.comparable && wpmDelta.direction === 'up') {
    return `Speed is moving in the right direction and your ceiling this period was ${round1(
      best
    )} WPM. Keep the sessions frequent rather than long - the gains here came from turning up regularly.`;
  }
  if (wpmDelta.comparable && wpmDelta.direction === 'down') {
    return `Speed dipped this period, which most often follows a push on accuracy or a change of material. Your ceiling was still ${round1(
      best
    )} WPM, so the range is intact - rebuild the average with short, unhurried sessions.`;
  }
  return `Your ceiling this period was ${round1(
    best
  )} WPM. Consistency is the lever now: regular short sessions move the average far more reliably than occasional long ones.`;
}

export interface BuildReportInput {
  rows: ReportResultRow[];
  charts: ProgressChart[];
  errorAnalysis?: ErrorAnalysisSummary;
  recommendations: UserRecommendation[];
  period: ReportPeriod;
  sections: ReportSections;
  /** Injected so the caller controls "now" — keeps this pure and testable. */
  now?: Date;
}

/**
 * Assembles the report entirely from data already on the client.
 *
 * Every headline figure is recomputed from rows inside the window: the
 * server's AnalyticsOverview is lifetime-scoped, so reusing it here would print
 * a career total under a "Monthly report" heading.
 */
export function buildReport({
  rows,
  charts,
  errorAnalysis,
  recommendations,
  period,
  sections,
  now = new Date(),
}: BuildReportInput): ReportModel {
  const days = PERIOD_DAYS[period];
  const to = now;
  const from = new Date(to.getTime() - days * DAY_MS);
  const priorFrom = new Date(from.getTime() - days * DAY_MS);

  const current = withinWindow(rows, from, to);
  const previous = withinWindow(rows, priorFrom, from);

  const avgWpm = mean(current.map((r) => r.wpm));
  const avgAccuracy = mean(current.map((r) => r.accuracy));
  const totalTime = current.reduce((a, r) => a + r.timeTaken, 0);
  const totalErrors = current.reduce((a, r) => a + r.errors, 0);
  const bestWpm = current.length ? Math.max(...current.map((r) => r.wpm)) : 0;

  const wpmDelta = deltaBetween(avgWpm, mean(previous.map((r) => r.wpm)));
  const accuracyDelta = deltaBetween(
    avgAccuracy,
    mean(previous.map((r) => r.accuracy))
  );
  const volumeDelta = deltaBetween(current.length, previous.length);

  const metrics: ReportMetric[] = [
    {
      key: 'tests',
      label: 'Tests completed',
      value: String(current.length),
      caption: previous.length ? `${previous.length} in the prior window` : undefined,
      delta: volumeDelta,
      higherIsBetter: true,
    },
    {
      key: 'wpm',
      // Abbreviated because these labels set uppercase and letter-spaced in a
      // narrow column; the detailed table below has room for the full word.
      label: 'Avg speed',
      value: `${Math.round(avgWpm)}`,
      caption: 'words per minute',
      delta: wpmDelta,
      higherIsBetter: true,
    },
    {
      key: 'accuracy',
      label: 'Avg accuracy',
      value: `${round1(avgAccuracy)}%`,
      caption: `${totalErrors} ${totalErrors === 1 ? 'error' : 'errors'} in total`,
      delta: accuracyDelta,
      higherIsBetter: true,
    },
    {
      key: 'time',
      label: 'Time practised',
      value: formatDuration(totalTime),
      caption: `peak of ${round1(bestWpm)} WPM`,
      higherIsBetter: true,
    },
  ];

  const reportCharts: ReportChart[] = sections.charts
    ? charts
        .map((chart) => {
          const points = chart.data.filter((point) => {
            const at = new Date(point.date).getTime();
            return at >= from.getTime() && at < to.getTime();
          });
          const trendPercentage = trendOf(points);
          return {
            type: chart.type,
            title: CHART_TITLES[chart.type] ?? chart.type,
            caption: `${describeTrend(
              trendPercentage,
              CHART_TITLES[chart.type] ?? chart.type
            )} across ${points.length} recorded ${
              points.length === 1 ? 'day' : 'days'
            }.`,
            points,
            trendPercentage,
          };
        })
        // A single point draws a dot, not a trend — not worth a page of paper.
        .filter((chart) => chart.points.length >= 2)
    : [];

  const stats: ReportStatRow[] = sections.detailedStats
    ? [
        { label: 'Tests completed', value: String(current.length) },
        { label: 'Fastest test', value: `${round1(bestWpm)} WPM` },
        {
          label: 'Slowest test',
          value: current.length
            ? `${round1(Math.min(...current.map((r) => r.wpm)))} WPM`
            : '-',
        },
        { label: 'Average speed', value: `${round1(avgWpm)} WPM` },
        { label: 'Average accuracy', value: `${round1(avgAccuracy)}%` },
        {
          label: 'Best accuracy',
          value: current.length
            ? `${round1(Math.max(...current.map((r) => r.accuracy)))}%`
            : '-',
        },
        { label: 'Total errors', value: String(totalErrors) },
        {
          label: 'Errors per test',
          value: current.length
            ? String(round1(totalErrors / current.length))
            : '-',
        },
        { label: 'Time practised', value: formatDuration(totalTime) },
        {
          label: 'Average session',
          value: current.length
            ? formatDuration(totalTime / current.length)
            : '-',
        },
      ]
    : [];

  return {
    title: `${PERIOD_NAME[period]} typing report`,
    period,
    periodLabel: PERIOD_NAME[period],
    rangeLabel: `${shortDate(from)} - ${shortDate(to)}, ${to.getFullYear()}`,
    generatedAt: formatDate(to),
    summary: current.length
      ? writeSummary(current, previous, days, wpmDelta)
      : '',
    metrics,
    charts: reportCharts,
    stats,
    errorAnalysis: sections.detailedStats ? errorAnalysis : undefined,
    recommendations: sections.recommendations ? recommendations : [],
    closing: current.length ? writeClosing(current, wpmDelta) : '',
    testCount: current.length,
  };
}

export const CHART_UNIT = CHART_UNITS;
