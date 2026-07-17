import { useTestPreferences } from '@/hooks/useTestPreferences';
import {
  getHeatmapLetterRows,
  LAYOUT_LABELS,
  type LayoutId,
} from '@/utils/keyboardLayouts';
import type { AccuracyHeatmap, HeatmapCell } from '@tactile/types';
import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface ErrorHeatmapProps {
  heatmapData: AccuracyHeatmap;
  title?: string;
  /** Override layout; defaults to test preferences */
  layout?: LayoutId;
}

const getColorIntensity = (accuracy: number, hasData: boolean) => {
  if (!hasData) {
    return 'rgba(156, 163, 175, 0.3)';
  }
  const intensity = accuracy / 100;
  if (accuracy >= 95) {
    return `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`;
  } else if (accuracy >= 85) {
    return `rgba(251, 191, 36, ${0.2 + (1 - intensity) * 0.6})`;
  } else if (accuracy >= 70) {
    return `rgba(249, 115, 22, ${0.2 + (1 - intensity) * 0.6})`;
  } else {
    return `rgba(239, 68, 68, ${0.2 + (1 - intensity) * 0.6})`;
  }
};

const getTextColor = (accuracy: number, hasData: boolean) => {
  if (!hasData) {
    return 'text-gray-500';
  }
  if (accuracy >= 85) {
    return 'text-gray-800';
  }
  return 'text-white';
};

const KeyboardRow: React.FC<{ row: string; characters: HeatmapCell[] }> = ({
  row,
  characters,
}) => {
  return (
    <div key={row} className="flex flex-wrap gap-1 justify-center" role="row">
      {characters.map((cell, cellIndex) => {
        const hasData = cell.frequency > 0;
        const isSpace = cell.character === ' ';
        return (
          <Tooltip key={`${row}-${cellIndex}`}>
            <TooltipTrigger>
              <div
                role="gridcell"
                aria-label={
                  hasData
                    ? `${cell.character === ' ' ? 'Space' : cell.character}: ${cell.accuracy.toFixed(0)}% accuracy`
                    : `${cell.character === ' ' ? 'Space' : cell.character}: no data`
                }
                className={`
                  ${isSpace ? 'w-32' : 'w-10'} h-10 rounded flex items-center justify-center
                  text-sm font-semibold cursor-pointer
                  transition-transform motion-reduce:transition-none duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                  [@media(hover:hover)_and_(pointer:fine)]:hover:scale-105 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-lg
                  motion-reduce:hover:scale-100
                  ${getTextColor(cell.accuracy, hasData)}
                `}
                style={{
                  backgroundColor: getColorIntensity(cell.accuracy, hasData),
                }}
              >
                {cell.character === ' ' ? '␣' : cell.character}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-accent">
              <div className="text-xs text-center">
                <div className="font-semibold">
                  {cell.character === ' ' ? 'Space' : `"${cell.character}"`}
                </div>
                {hasData ? (
                  <>
                    <div>Accuracy: {cell.accuracy.toFixed(1)}%</div>
                    <div>Frequency: {cell.frequency}</div>
                  </>
                ) : (
                  <div>No data available</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

function cellFor(
  char: string,
  map: Map<string, HeatmapCell>
): HeatmapCell {
  return (
    map.get(char) ?? {
      character: char,
      accuracy: 0,
      frequency: 0,
      color: 'gray',
    }
  );
}

export const ErrorHeatmap: React.FC<ErrorHeatmapProps> = ({
  heatmapData,
  title = 'Character Accuracy Heatmap',
  layout: layoutProp,
}) => {
  const { prefs } = useTestPreferences();
  const layout = layoutProp ?? prefs.keyboardLayout;

  const keyboardRows = useMemo(() => {
    const existingChars = new Map(
      heatmapData.characters.map((cell) => [cell.character, cell])
    );
    const { uppercase, lowercase, numbers, symbols } =
      getHeatmapLetterRows(layout);

    const rows: { row: string; characters: HeatmapCell[] }[] = [];

    uppercase.forEach((r, i) => {
      rows.push({
        row: `uppercase_row${i + 1}`,
        characters: r.map((c) => cellFor(c, existingChars)),
      });
    });
    lowercase.forEach((r, i) => {
      rows.push({
        row: `lowercase_row${i + 1}`,
        characters: r.map((c) => cellFor(c, existingChars)),
      });
    });
    rows.push({
      row: 'numbers_row',
      characters: numbers.map((c) => cellFor(c, existingChars)),
    });
    symbols.forEach((r, i) => {
      if (r.length) {
        rows.push({
          row: `symbols_row${i + 1}`,
          characters: r.map((c) => cellFor(c, existingChars)),
        });
      }
    });
    rows.push({
      row: 'space_row',
      characters: [cellFor(' ', existingChars)],
    });

    return rows;
  }, [heatmapData, layout]);

  return (
    <div className="bg-accent/10 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-text/50">
          Layout: {LAYOUT_LABELS[layout]} — hover keys for accuracy stats.
          Change layout in test settings.
        </p>
      </div>

      <div className="space-y-4 mb-6" role="grid" aria-label={title}>
        <div>
          <h4 className="text-sm font-medium text-text/50 mb-2 text-center">
            Uppercase
          </h4>
          <div className="space-y-2">
            {keyboardRows
              .filter((row) => row.row.startsWith('uppercase'))
              .map(({ row, characters }) => (
                <KeyboardRow key={row} row={row} characters={characters} />
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-text/50 mb-2 text-center">
            Lowercase
          </h4>
          <div className="space-y-2">
            {keyboardRows
              .filter((row) => row.row.startsWith('lowercase'))
              .map(({ row, characters }) => (
                <KeyboardRow key={row} row={row} characters={characters} />
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-text/50 mb-2 text-center">
            Numbers & symbols
          </h4>
          <div className="space-y-2">
            {keyboardRows
              .filter(
                (row) =>
                  !row.row.includes('uppercase') &&
                  !row.row.includes('lowercase')
              )
              .map(({ row, characters }) => (
                <KeyboardRow key={row} row={row} characters={characters} />
              ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }}
            aria-hidden
          />
          <span className="text-text/80">95%+ Excellent</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(251, 191, 36, 0.8)' }}
            aria-hidden
          />
          <span className="text-text/80">85-94% Good</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.8)' }}
            aria-hidden
          />
          <span className="text-text/80">70-84% Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
            aria-hidden
          />
          <span className="text-text/80">&lt;70% Needs work</span>
        </div>
      </div>
    </div>
  );
};
