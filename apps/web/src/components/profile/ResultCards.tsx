import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TestResult } from '@/services/api';
import { formatTime } from '@/utils/typingEngine';
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import React, { useState } from 'react';
import { Skeleton } from '../ui/skeleton';

export interface ResultFilters {
  mode?: string;
  testType?: string;
  difficulty?: string;
}

interface ResultCardsProps {
  results: TestResult[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isFetching?: boolean;
  isLoading?: boolean;
  filters?: ResultFilters;
  onPageChange: (page: number) => void;
  onFiltersChange?: (filters: ResultFilters) => void;
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function ResultCard({ result }: { result: TestResult }) {
  const difficulty = result.testText?.difficulty;
  const language = result.testText?.language;
  const modeLabel =
    result.mode === 'timer'
      ? result.modeTarget
        ? `${result.modeTarget}s`
        : 'timer'
      : result.mode === 'words'
        ? result.modeTarget
          ? `${result.modeTarget} words`
          : 'words'
        : null;

  return (
    <article className="rounded-xl p-4 flex flex-col gap-3 border border-accent/12 hover:border-accent/25 hover:bg-accent/[0.06] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-sm truncate">
            {result.testText?.title || 'Custom text'}
          </h3>
          <p className="text-xs text-text/40 mt-0.5">
            {relativeTime(result.completedAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold font-mono text-accent leading-none">
            {Math.round(Number(result.wpm))}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-text/40 mt-0.5">
            WPM
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono bg-accent/20 text-text/80 px-2 py-0.5 rounded-md">
          {Number(result.accuracy).toFixed(1)}% acc
        </span>
        <span className="text-xs text-text/50 font-mono">
          {formatTime(result.timeTaken)}
        </span>
        {modeLabel && (
          <span className="text-xs text-text/50 bg-primary/40 px-2 py-0.5 rounded-md">
            {modeLabel}
          </span>
        )}
        {result.testType && (
          <span className="text-xs capitalize text-text/50 bg-primary/40 px-2 py-0.5 rounded-md">
            {result.testType}
          </span>
        )}
        {difficulty && (
          <span className="text-xs capitalize text-text/50 bg-primary/40 px-2 py-0.5 rounded-md">
            {difficulty}
          </span>
        )}
        {language && language !== 'en' && (
          <span className="text-xs uppercase text-text/50 bg-primary/40 px-2 py-0.5 rounded-md">
            {language}
          </span>
        )}
      </div>

      {result.testText?.content && (
        <p className="text-xs text-text/40 line-clamp-2 leading-relaxed">
          {result.testText.content}
        </p>
      )}
    </article>
  );
}

function ResultRow({ result }: { result: TestResult }) {
  return (
    <TableRow>
      <TableCell className="px-5 sm:px-6 py-3">
        {new Date(result.completedAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="px-5 sm:px-6 py-3 font-medium text-accent tabular-nums">
        {Math.round(Number(result.wpm))}
      </TableCell>
      <TableCell className="px-5 sm:px-6 py-3 tabular-nums">
        {Number(result.accuracy).toFixed(1)}%
      </TableCell>
      <TableCell className="px-5 sm:px-6 py-3 tabular-nums">
        {formatTime(result.timeTaken)}
      </TableCell>
      <TableCell className="px-5 sm:px-6 py-3 text-text/50 max-w-xs truncate">
        {result.testText?.content || 'Custom Text'}
      </TableCell>
    </TableRow>
  );
}

const FILTERS = [
  {
    key: 'mode' as const,
    label: 'All modes',
    options: [
      { value: 'timer', label: 'Timer' },
      { value: 'words', label: 'Words' },
    ],
  },
  {
    key: 'testType' as const,
    label: 'All types',
    options: [
      { value: 'text', label: 'Text' },
      { value: 'punctuation', label: 'Punctuation' },
      { value: 'numbers', label: 'Numbers' },
      { value: 'quotes', label: 'Quotes' },
      { value: 'code', label: 'Code' },
      { value: 'symbols', label: 'Symbols' },
    ],
  },
  {
    key: 'difficulty' as const,
    label: 'All difficulty',
    options: [
      { value: 'easy', label: 'Easy' },
      { value: 'medium', label: 'Medium' },
      { value: 'hard', label: 'Hard' },
    ],
  },
];

/** Radix Select has no empty-string value, so "all" is the reset sentinel. */
const ALL = 'all';

export const ResultCards: React.FC<ResultCardsProps> = ({
  results,
  totalCount,
  currentPage,
  pageSize,
  isFetching,
  isLoading,
  filters = {},
  onPageChange,
  onFiltersChange,
}) => {
  const [view, setView] = useState<'cards' | 'table'>('table');
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  const updateFilter = (key: keyof ResultFilters, value: string) => {
    onFiltersChange?.({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <Panel
      title="Recent results"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {onFiltersChange && (
            <>
              {FILTERS.map((filter) => (
                <Select
                  key={filter.key}
                  value={filters[filter.key] ?? ALL}
                  onValueChange={(value) =>
                    updateFilter(filter.key, value === ALL ? '' : value)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="h-8 text-xs"
                    aria-label={filter.label}
                  >
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{filter.label}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-accent/20 p-0.5">
            <Button
              size="sm"
              variant={view === 'cards' ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setView('cards')}
              aria-label="Card view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="sm"
              variant={view === 'table' ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setView('table')}
              aria-label="Table view"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 && !isFetching ? (
        <p className="py-8 text-center text-text/50">
          No test results found for this page
        </p>
      ) : view === 'cards' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {results.map((result, index) =>
            result.id ? (
              <ResultCard key={result.id} result={result} />
            ) : (
              <Skeleton key={`sk-${index}`} className="h-32 rounded-xl" />
            )
          )}
        </div>
      ) : (
        <div className="-mx-5 sm:-mx-6">
          <Table>
            <TableHeader className="border-y border-accent/12">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5 sm:px-6">Date</TableHead>
                <TableHead className="px-5 sm:px-6">WPM</TableHead>
                <TableHead className="px-5 sm:px-6">Accuracy</TableHead>
                <TableHead className="px-5 sm:px-6">Time</TableHead>
                <TableHead className="px-5 sm:px-6">Test</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) =>
                result.id ? (
                  <ResultRow key={result.id} result={result} />
                ) : (
                  <TableRow key={`sk-${index}`}>
                    <TableCell colSpan={5} className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalCount > 0 && (
        <div className="pt-4 mt-4 border-t border-accent/12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-text/50">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {(currentPage - 1) * pageSize + results.length} of {totalCount}{' '}
              results
              {isFetching && <span className="ml-2">(Loading...)</span>}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="icon"
                variant="ghost"
                disabled={currentPage === 1 || isFetching}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>

              {Array.from({ length: maxPage }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  disabled={isFetching}
                  variant={currentPage === page ? 'default' : 'secondary'}
                >
                  {page}
                </Button>
              ))}

              <Button
                size="icon"
                variant="ghost"
                disabled={currentPage >= maxPage || isFetching}
                onClick={() => onPageChange(Math.min(maxPage, currentPage + 1))}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};
