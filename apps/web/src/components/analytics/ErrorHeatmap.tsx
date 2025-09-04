import type { AccuracyHeatmap, HeatmapCell } from '@tactile/types';
import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface ErrorHeatmapProps {
  heatmapData: AccuracyHeatmap;
  title?: string;
}

// Separate QWERTY keyboard layouts for uppercase and lowercase letters
const qwertyLayout = {
  // Uppercase letters in QWERTY order
  uppercase_row1: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  uppercase_row2: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  uppercase_row3: ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],

  // Lowercase letters in QWERTY order
  lowercase_row1: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  lowercase_row2: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  lowercase_row3: ['z', 'x', 'c', 'v', 'b', 'n', 'm'],

  // Numbers and symbols
  numbers_row: [
    '`',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '0',
    '-',
    '=',
  ],
  symbols_row1: ['[', ']', '\\'],
  symbols_row2: [';', "'"],
  symbols_row3: [',', '.', '/'],
  space_row: [' '], // Space bar
};

const getColorIntensity = (accuracy: number, hasData: boolean) => {
  if (!hasData) {
    return 'rgba(156, 163, 175, 0.3)'; // gray for no data
  }

  // Convert accuracy (0-100) to color intensity
  const intensity = accuracy / 100;

  if (accuracy >= 95) {
    return `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`; // green
  } else if (accuracy >= 85) {
    return `rgba(251, 191, 36, ${0.2 + (1 - intensity) * 0.6})`; // yellow
  } else if (accuracy >= 70) {
    return `rgba(249, 115, 22, ${0.2 + (1 - intensity) * 0.6})`; // orange
  } else {
    return `rgba(239, 68, 68, ${0.2 + (1 - intensity) * 0.6})`; // red
  }
};

const getTextColor = (accuracy: number, hasData: boolean) => {
  if (!hasData) {
    return 'text-gray-500 dark:text-gray-400';
  }

  if (accuracy >= 85) {
    return 'text-gray-800 dark:text-gray-200';
  } else {
    return 'text-white';
  }
};

const KeyboardRow: React.FC<{ row: string; characters: HeatmapCell[] }> = ({
  row,
  characters,
}) => {
  return (
    <div key={row} className="flex flex-wrap gap-1 justify-center">
      {characters.map((cell, cellIndex) => {
        const hasData = cell.frequency > 0;
        const isSpace = cell.character === ' ';
        return (
          <Tooltip key={`${row}-${cellIndex}`}>
            <TooltipTrigger>
              <div
                className={`
                            ${isSpace ? 'w-32' : 'w-10'} h-10 rounded flex items-center justify-center
                             text-sm font-semibold cursor-pointer
                            transition-all duration-200 hover:scale-110 hover:shadow-lg
                            border border-gray-200 dark:border-gray-600
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

export const ErrorHeatmap: React.FC<ErrorHeatmapProps> = ({
  heatmapData,
  title = 'Character Accuracy Heatmap',
}) => {
  // Generate all printable ASCII characters arranged in QWERTY layout
  const getAllCharacters = (): { row: string; characters: HeatmapCell[] }[] => {
    const existingChars = new Map(
      heatmapData.characters.map((cell) => [cell.character, cell])
    );

    const keyboardRows: { row: string; characters: HeatmapCell[] }[] = [];

    // Process each keyboard row
    Object.entries(qwertyLayout).forEach(([rowName, rowChars]) => {
      const rowCells: HeatmapCell[] = [];

      rowChars.forEach((char) => {
        if (char === ' ') {
          // Handle space character
          const existingCell = existingChars.get(' ');
          if (existingCell) {
            rowCells.push(existingCell);
          } else {
            rowCells.push({
              character: ' ',
              accuracy: 0,
              frequency: 0,
              color: 'gray',
            });
          }
        } else if (char.length === 1) {
          // Regular character (symbols, numbers, etc.)
          const existingCell = existingChars.get(char);
          if (existingCell) {
            rowCells.push(existingCell);
          } else {
            rowCells.push({
              character: char,
              accuracy: 0,
              frequency: 0,
              color: 'gray',
            });
          }
        } else {
          // Special keys (like ⇥, ⇪, etc.) - skip for now
          return;
        }
      });

      if (rowCells.length > 0) {
        keyboardRows.push({
          row: rowName,
          characters: rowCells,
        });
      }
    });

    // Add remaining characters not in main keyboard layout
    const usedChars = new Set();
    Object.values(qwertyLayout).forEach((row) => {
      row.forEach((char) => {
        if (char.length === 1) {
          usedChars.add(char);
        }
        // Skip special keys
      });
    });

    const remainingChars: HeatmapCell[] = [];
    for (let code = 32; code <= 126; code++) {
      const char = String.fromCharCode(code);
      if (!usedChars.has(char)) {
        const existingCell = existingChars.get(char);
        if (existingCell) {
          remainingChars.push(existingCell);
        } else {
          remainingChars.push({
            character: char,
            accuracy: 0,
            frequency: 0,
            color: 'gray',
          });
        }
      }
    }

    if (remainingChars.length > 0) {
      // Group remaining characters into rows of 10
      const remainingRows: { row: string; characters: HeatmapCell[] }[] = [];
      for (let i = 0; i < remainingChars.length; i += 10) {
        remainingRows.push({
          row: `extra${Math.floor(i / 10) + 1}`,
          characters: remainingChars.slice(i, i + 10),
        });
      }
      keyboardRows.push(...remainingRows);
    }

    return keyboardRows;
  };

  const keyboardRows = getAllCharacters();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Hover over characters to see detailed accuracy statistics
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {/* Uppercase Letters Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Uppercase Letters
          </h4>
          <div className="space-y-2">
            {keyboardRows
              .filter((row) => row.row.startsWith('uppercase'))
              .map(({ row, characters }) => (
                <KeyboardRow key={row} row={row} characters={characters} />
              ))}
          </div>
        </div>

        {/* Lowercase Letters Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Lowercase Letters
          </h4>
          <div className="space-y-2">
            {keyboardRows
              .filter((row) => row.row.startsWith('lowercase'))
              .map(({ row, characters }) => (
                <KeyboardRow key={row} row={row} characters={characters} />
              ))}
          </div>
        </div>

        {/* Numbers and Symbols Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Numbers & Symbols
          </h4>
          <div className="space-y-2">
            {keyboardRows
              .filter(
                (row) =>
                  !row.row.includes('uppercase') &&
                  !row.row.includes('lowercase') &&
                  !row.row.includes('extra')
              )
              .map(({ row, characters }) => (
                <KeyboardRow key={row} row={row} characters={characters} />
              ))}
          </div>
        </div>

        {/* Extra Characters Section */}
        {keyboardRows.filter((row) => row.row.includes('extra')).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
              Additional Characters
            </h4>
            <div className="space-y-2">
              {keyboardRows
                .filter((row) => row.row.includes('extra'))
                .map(({ row, characters }) => (
                  <KeyboardRow key={row} row={row} characters={characters} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }}
          ></div>
          <span className="text-gray-600 dark:text-gray-400">
            95%+ Excellent
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(251, 191, 36, 0.8)' }}
          ></div>
          <span className="text-gray-600 dark:text-gray-400">85-94% Good</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.8)' }}
          ></div>
          <span className="text-gray-600 dark:text-gray-400">70-84% Fair</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
          ></div>
          <span className="text-gray-600 dark:text-gray-400">
            &lt;70% Needs Work
          </span>
        </div>
      </div>
    </div>
  );
};
