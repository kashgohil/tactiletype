import { Button } from '@/components/ui/button';
import type { TestResult } from '@/services/api';
import { formatTime } from '@/utils/typingEngine';
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import React, { useState } from 'react';
import { Skeleton } from '../ui/skeleton';

interface ResultCardsProps {
  results: TestResult[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isFetching?: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
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
    <tr className="hover:bg-accent/5 border-b border-accent/10 last:border-0">
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        {relativeTime(result.completedAt)}
      </td>
      <td className="px-4 py-3 text-sm font-mono font-medium text-accent">
        {Math.round(Number(result.wpm))}
      </td>
      <td className="px-4 py-3 text-sm font-mono">
        {Number(result.accuracy).toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-sm font-mono">
        {formatTime(result.timeTaken)}
      </td>
      <td className="px-4 py-3 text-sm text-text/50 max-w-[200px] truncate">
        {result.testText?.title || result.testText?.content || 'Custom text'}
      </td>
    </tr>
  );
}

export const ResultCards: React.FC<ResultCardsProps> = ({
  results,
  totalCount,
  currentPage,
  pageSize,
  isFetching,
  isLoading,
  onPageChange,
}) => {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <section className="bg-accent/5 rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
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

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3 px-5 pb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 && !isFetching ? (
        <p className="px-5 pb-6 text-sm text-text/50 text-center">
          No results on this page.
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
        <div className="overflow-x-auto px-1 pb-2">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-text/50 uppercase tracking-wider border-b border-accent/15">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">WPM</th>
                <th className="px-4 py-2 font-medium">Accuracy</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Test</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) =>
                result.id ? (
                  <ResultRow key={result.id} result={result} />
                ) : (
                  <tr key={`sk-${index}`}>
                    <td colSpan={5} className="px-4 py-3">
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
        <div className="px-5 py-4 border-t border-accent/15 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text/50">
            Showing {(currentPage - 1) * pageSize + 1}–
            {(currentPage - 1) * pageSize + results.length} of {totalCount}
            {isFetching && <span className="ml-1">(loading…)</span>}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={currentPage === 1 || isFetching}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm text-text/60 px-2 font-mono">
              {currentPage} / {maxPage}
            </span>
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
      )}
    </section>
  );
};
