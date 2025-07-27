import React from 'react';

export const TypingTest: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
          Typing Test
        </h1>
        
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p className="text-lg mb-4">Typing test component coming soon!</p>
          <p>This will include:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Real-time WPM and accuracy tracking</li>
            <li>Multiple test modes and difficulties</li>
            <li>Keystroke analysis</li>
            <li>Progress visualization</li>
          </ul>
        </div>
      </div>
    </div>
  );
};