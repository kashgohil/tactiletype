import React from 'react';
import type { AccuracyHeatmap } from '@tactile/types';

interface ErrorHeatmapProps {
  heatmapData: AccuracyHeatmap;
  title?: string;
}

export const ErrorHeatmap: React.FC<ErrorHeatmapProps> = ({ 
  heatmapData, 
  title = "Character Accuracy Heatmap" 
}) => {
  const getColorIntensity = (accuracy: number) => {
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

  const getTextColor = (accuracy: number) => {
    if (accuracy >= 85) {
      return 'text-gray-800 dark:text-gray-200';
    } else {
      return 'text-white';
    }
  };

  // Group characters by rows for better display
  const groupCharactersByRows = (characters: typeof heatmapData.characters) => {
    const rows = [];
    const charsPerRow = 10;
    
    for (let i = 0; i < characters.length; i += charsPerRow) {
      rows.push(characters.slice(i, i + charsPerRow));
    }
    
    return rows;
  };

  const characterRows = groupCharactersByRows(heatmapData.characters);

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

      <div className="space-y-2 mb-6">
        {characterRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-wrap gap-2 justify-center">
            {row.map((cell, cellIndex) => (
              <div
                key={`${rowIndex}-${cellIndex}`}
                className="relative group"
              >
                <div
                  className={`
                    w-12 h-12 rounded-lg flex items-center justify-center
                    font-mono text-lg font-semibold cursor-pointer
                    transition-all duration-200 hover:scale-110 hover:shadow-lg
                    border border-gray-200 dark:border-gray-600
                    ${getTextColor(cell.accuracy)}
                  `}
                  style={{ backgroundColor: getColorIntensity(cell.accuracy) }}
                  title={`${cell.character}: ${cell.accuracy.toFixed(1)}% accuracy (${cell.frequency} times)`}
                >
                  {cell.character === ' ' ? '␣' : cell.character}
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  <div className="text-center">
                    <div className="font-semibold">
                      {cell.character === ' ' ? 'Space' : `"${cell.character}"`}
                    </div>
                    <div>Accuracy: {cell.accuracy.toFixed(1)}%</div>
                    <div>Frequency: {cell.frequency}</div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }}></div>
          <span className="text-gray-600 dark:text-gray-400">95%+ Excellent</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.8)' }}></div>
          <span className="text-gray-600 dark:text-gray-400">85-94% Good</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.8)' }}></div>
          <span className="text-gray-600 dark:text-gray-400">70-84% Fair</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;70% Needs Work</span>
        </div>
      </div>
    </div>
  );
};