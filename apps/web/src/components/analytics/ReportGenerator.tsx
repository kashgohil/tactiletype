import { Skeleton } from '@/components/ui/skeleton';
import { analyticsApi } from '@/services/analyticsApi';
import { describeError } from '@/utils/describeError';
import {
  applySections,
  buildReport,
  PERIOD_DAYS,
  sectionAvailability,
  type ReportFormat,
  type ReportPeriod,
  type ReportSections,
} from '@/utils/report/buildReport';
import {
  downloadReportHtml,
  downloadReportJson,
  printReport,
  whenImagesReady,
} from '@/utils/report/exportReport';
import { withChartImages } from '@/utils/report/renderChartImage';
import type { ErrorAnalysisSummary, ProgressChart } from '@tactile/types';
import type { UserRecommendation } from '@tactile/types';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Mail, Printer } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Panel } from '../ui/panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { A4Frame } from './report/A4Frame';
import { ReportDocument } from './report/ReportDocument';
import { ReportPrintPortal } from './report/ReportPrintPortal';

interface ReportGeneratorProps {
  progressCharts: ProgressChart[];
  errorAnalysis?: ErrorAnalysisSummary;
  recommendations: UserRecommendation[];
  onExportData: (format: 'csv' | 'json') => void;
  /** Disables the raw-data buttons when there is nothing to export. */
  hasResults: boolean;
}

const FORMAT_ACTION: Record<ReportFormat, string> = {
  pdf: 'Generate PDF',
  html: 'Download HTML',
  json: 'Download JSON',
};

const FORMAT_HINT: Record<ReportFormat, string> = {
  pdf: "Opens your browser's print dialog — choose Save as PDF as the destination.",
  html: 'A single file with styles, fonts and charts inlined; it opens anywhere, offline.',
  json: 'The figures behind the report, without the charts drawn from them.',
};

/**
 * The tickboxes, each paired with what to say when the section has nothing
 * behind it — a box you can tick for a section that will not print is a lie
 * about what you are about to get.
 */
const INCLUDE_OPTIONS: Array<{
  key: keyof ReportSections;
  id: string;
  label: string;
  emptyNote: string;
}> = [
  {
    key: 'charts',
    id: 'report-charts',
    label: 'Progress charts',
    emptyNote: 'too few days recorded',
  },
  {
    key: 'detailedStats',
    id: 'report-stats',
    label: 'Detailed statistics & errors',
    emptyNote: 'nothing in this period',
  },
  {
    key: 'recommendations',
    id: 'report-recommendations',
    label: 'Recommendations',
    emptyNote: 'none yet',
  },
];

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  progressCharts,
  errorAnalysis,
  recommendations,
  onExportData,
  hasResults,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [sections, setSections] = useState<ReportSections>({
    charts: true,
    detailedStats: true,
    recommendations: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // The overview endpoint is lifetime-scoped, so a period-accurate report has
  // to work from the rows themselves. Cached, because this also backs the live
  // preview and every config change re-derives from it.
  const rowsQuery = useQuery({
    queryKey: ['analytics', 'resultRows'],
    queryFn: analyticsApi.getResultRows,
    staleTime: 5 * 60 * 1000,
  });

  // Built whole, then narrowed. The full model is also what tells us which
  // sections have any content, so the tickboxes below can only offer what the
  // document would actually print.
  const fullReport = useMemo(() => {
    if (!rowsQuery.data) return null;
    return buildReport({
      rows: rowsQuery.data,
      charts: progressCharts,
      errorAnalysis,
      recommendations,
      period,
    });
  }, [rowsQuery.data, progressCharts, errorAnalysis, recommendations, period]);

  const available = useMemo(
    () => (fullReport ? sectionAvailability(fullReport) : null),
    [fullReport]
  );

  const report = useMemo(() => {
    if (!fullReport) return null;
    const model = applySections(fullReport, sections);
    // Rasterised for the preview too, so what is on screen is exactly what
    // prints — no second chart implementation to drift out of sync.
    return { ...model, charts: withChartImages(model.charts) };
  }, [fullReport, sections]);

  const isEmpty = report !== null && report.testCount === 0;
  const hasAnyResult = (rowsQuery.data?.length ?? 0) > 0;

  // Printing waits a commit so the portal is in the DOM, then waits again for
  // its images to decode — the dialog captures what is painted when it opens.
  useEffect(() => {
    if (!pendingPrint || !report) return;
    let cancelled = false;

    (async () => {
      await whenImagesReady(document.getElementById('report-print-root'));
      if (cancelled) return;
      printReport(report);
      setPendingPrint(false);
      setIsGenerating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingPrint, report]);

  const handleGenerate = async () => {
    if (!report || isEmpty) return;
    setIsGenerating(true);
    try {
      if (format === 'json') {
        downloadReportJson(report);
      } else if (format === 'html') {
        const sheet = previewRef.current?.querySelector<HTMLElement>(
          '[data-report-sheet]'
        );
        if (!sheet) throw new Error('The report preview is not ready yet.');
        await downloadReportHtml(report, sheet);
      } else {
        setPendingPrint(true);
        return; // the effect above finishes this one
      }
    } catch (error) {
      toast.error('Report failed', {
        id: 'report-generate-failed',
        description: describeError(error),
      });
    } finally {
      if (format !== 'pdf') setIsGenerating(false);
    }
  };

  const toggle = (key: keyof ReportSections) => (value: boolean | string) =>
    setSections((current) => ({ ...current, [key]: value === true }));

  return (
    // No panel header: the heading and its actions live in the left column, so
    // the page opposite them starts at the very top of the panel.
    <Panel>
      {/* Controls beside the page, an even split. Half of the shell is narrower
          than A4's 794px, so the page scales to roughly 70% — proportions and
          measure hold, it just reads smaller. */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Heading, configuration and actions. `self-start` stops the grid
            stretching this column to the height of the page beside it. */}
        <div className="flex flex-col gap-5 self-start">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Generate report
            </h2>
            <p className="text-sm text-text/45 mt-1 leading-relaxed">
              Built in your browser from data already loaded — nothing is sent
              anywhere.
            </p>
            <div className="flex items-center gap-2 mt-3 -ml-3">
              <Button
                onClick={() => onExportData('csv')}
                size="sm"
                variant="ghost"
                disabled={!hasResults}
              >
                Export CSV
              </Button>
              <Button
                onClick={() => onExportData('json')}
                size="sm"
                variant="ghost"
                disabled={!hasResults}
              >
                Export JSON
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-text/50 mb-2">Time period</Label>
              <Select
                value={period}
                onValueChange={(value) => setPeriod(value as ReportPeriod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last week</SelectItem>
                  <SelectItem value="month">Last month</SelectItem>
                  <SelectItem value="quarter">Last quarter</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-text/50 mb-2">Format</Label>
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ReportFormat)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select report format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF — via your print dialog</SelectItem>
                  <SelectItem value="html">HTML — a single self-contained file</SelectItem>
                  <SelectItem value="json">JSON — the figures behind it</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-text/50 mb-2">Include</Label>
            <div className="space-y-2">
              {INCLUDE_OPTIONS.map((option) => {
                // Unknown until the rows land; treated as present so the list
                // does not flicker through a disabled state on every load.
                const isAvailable = available?.[option.key] ?? true;
                return (
                  <Label
                    key={option.key}
                    htmlFor={option.id}
                    className={
                      isAvailable
                        ? 'font-normal cursor-pointer'
                        : 'font-normal cursor-not-allowed text-text/40'
                    }
                  >
                    <Checkbox
                      id={option.id}
                      checked={isAvailable && sections[option.key]}
                      disabled={!isAvailable}
                      onCheckedChange={toggle(option.key)}
                    />
                    {option.label}
                    {!isAvailable && (
                      <span className="text-xs text-text/35">
                        — {option.emptyNote}
                      </span>
                    )}
                  </Label>
                );
              })}
            </div>
          </div>

          {/* Action closes the left column, directly under the settings it
              applies to. */}
          <div className="pt-5 border-t border-accent/15 flex flex-col gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isEmpty || !report}
              className="w-full flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current/30 border-t-current" />
                  Preparing…
                </>
              ) : (
                <>
                  {format === 'pdf' ? (
                    <Printer className="size-4" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {FORMAT_ACTION[format]}
                </>
              )}
            </Button>
            <p className="text-xs text-text/45 leading-relaxed">
              {FORMAT_HINT[format]}
            </p>
          </div>
        </div>

        {/* The page itself, unlabelled and unframed — a document needs no
            caption to say it is one. */}
        <div className="min-w-0" ref={previewRef}>
          {rowsQuery.isLoading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {rowsQuery.isError && (
            <div className="rounded-lg border border-accent/15 bg-accent/[0.06] p-6 text-center">
              <p className="text-sm font-medium">
                Couldn't load your results
              </p>
              <p className="text-sm text-text/50 mt-1">
                {describeError(rowsQuery.error)}
              </p>
              <Button
                onClick={() => rowsQuery.refetch()}
                size="sm"
                variant="ghost"
                className="mt-3"
              >
                Try again
              </Button>
            </div>
          )}

          {/* An empty period and a failure are different problems, and the
              wording says which one this is. */}
          {isEmpty && (
            <div className="rounded-lg border border-accent/15 bg-accent/[0.06] p-6 text-center">
              <FileText className="size-5 mx-auto text-text/40" />
              <p className="text-sm font-medium mt-2">
                {hasAnyResult
                  ? `No tests in the last ${PERIOD_DAYS[period]} days`
                  : 'No tests recorded yet'}
              </p>
              <p className="text-sm text-text/50 mt-1 max-w-sm mx-auto leading-relaxed">
                {hasAnyResult
                  ? 'There is nothing to report on for this window. Try a longer period, or take a test to start the next one.'
                  : 'Take your first typing test and your report will have something to say.'}
              </p>
            </div>
          )}

          {/* Capped and scrollable: a report runs to several thousand pixels,
              and without a ceiling it sets the height of the whole panel. */}
          {report && !isEmpty && (
            <div className="max-h-[42rem] overflow-y-auto rounded-lg border border-accent/15 bg-accent/[0.06] p-4 sm:p-6">
              <A4Frame>
                <ReportDocument report={report} />
              </A4Frame>
            </div>
          )}
        </div>
      </div>

      {/* Automated reports */}
      <div className="mt-8 pt-6 border-t border-accent/15">
        <div className="flex items-start gap-3">
          <Mail className="text-accent shrink-0" />
          <div>
            <h5 className="font-medium mb-1">Email reports (coming soon)</h5>
            <p className="text-sm text-text/50 mb-3">
              Get automated weekly or monthly progress reports delivered to your
              email.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Label className="font-normal text-text/45">
                <Checkbox disabled />
                Weekly summary
              </Label>
              <Label className="font-normal text-text/45">
                <Checkbox disabled />
                Monthly report
              </Label>
            </div>
          </div>
        </div>
      </div>

      {pendingPrint && report && (
        <ReportPrintPortal>
          <ReportDocument report={report} />
        </ReportPrintPortal>
      )}
    </Panel>
  );
};
