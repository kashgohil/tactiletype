import { Button } from '@/components/ui/button';
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
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
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
    <article className="bg-accent/10 hover:bg-accent/15 transition-colors rounded-xl p-4 flex flex-col gap-3 border border-transparent hover:border-accent/20">
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
    <tr className="hover:bg-accent/5">
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {new Date(result.completedAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-accent">
        {Math.round(Number(result.wpm))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {Number(result.accuracy).toFixed(1)}%
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {formatTime(result.timeTaken)}
      </td>
      <td className="px-6 py-4 text-sm text-text/50 max-w-xs truncate">
        {result.testText?.content || 'Custom Text'}
      </td>
    </tr>
  );
}

const selectClass =
  'h-8 rounded-md border border-accent/20 bg-transparent px-2 text-xs text-text/80';

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
    <section className="bg-accent/10 rounded-lg overflow-hidden">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Recent Test Results</h3>
        <div className="flex flex-wrap items-center gap-2">
          {onFiltersChange && (
            <>
              <select
                className={selectClass}
                value={filters.mode ?? ''}
                onChange={(e) => updateFilter('mode', e.target.value)}
                aria-label="Filter by mode"
              >
                <option value="">All modes</option>
                <option value="timer">Timer</option>
                <option value="words">Words</option>
              </select>
              <select
                className={selectClass}
                value={filters.testType ?? ''}
                onChange={(e) => updateFilter('testType', e.target.value)}
                aria-label="Filter by type"
              >
                <option value="">All types</option>
                <option value="text">Text</option>
                <option value="punctuation">Punctuation</option>
                <option value="numbers">Numbers</option>
                <option value="quotes">Quotes</option>
                <option value="code">Code</option>
                <option value="symbols">Symbols</option>
              </select>
              <select
                className={selectClass}
                value={filters.difficulty ?? ''}
                onChange={(e) => updateFilter('difficulty', e.target.value)}
                aria-label="Filter by difficulty"
              >
                <option value="">All difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </>
          )}
          <div className="flex items-center gap-1 bg-accent/10 rounded-lg p-0.5">
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
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3 px-5 pb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 && !isFetching ? (
        <p className="px-6 py-8 text-center text-text/50">
          No test results found for this page
        </p>
      ) : view === 'cards' ? (
        <div className="grid sm:grid-cols-2 gap-3 px-5 pb-5">
          {results.map((result, index) =>
            result.id ? (
              <ResultCard key={result.id} result={result} />
            ) : (
              <Skeleton key={`sk-${index}`} className="h-32 rounded-xl" />
            )
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                  WPM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                  Test
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/20">
              {results.map((result, index) =>
                result.id ? (
                  <ResultRow key={result.id} result={result} />
                ) : (
                  <tr key={`sk-${index}`}>
                    <td colSpan={5} className="px-6 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalCount > 0 && (
        <div className="px-6 py-4 border-t border-accent/20">
          <div className="flex items-center justify-between">
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
    </section>
  );
};
