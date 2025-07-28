import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts';
import type { TestText } from '../services/api';
import { testResultsApi, testTextsApi } from '../services/api';
import type { TypingState, TypingStats } from '../utils/typingEngine';
import {
  TypingEngine,
  formatTime,
  generateTestText,
} from '../utils/typingEngine';

export const TypingTest: React.FC = () => {
  const { user } = useAuth();
  const [testText, setTestText] = useState('');
  const [currentTestText, setCurrentTestText] = useState<TestText | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<string>('medium');
  const [isLoadingTexts, setIsLoadingTexts] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [engine, setEngine] = useState<TypingEngine | null>(null);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    timeElapsed: 0,
  });
  const [state, setState] = useState<TypingState>({
    currentIndex: 0,
    userInput: '',
    errors: new Set(),
    startTime: null,
    endTime: null,
    isComplete: false,
    isStarted: false,
  });
  const [isTestActive, setIsTestActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize test with API text or fallback
  const initializeTest = useCallback(async () => {
    try {
      setIsLoadingTexts(true);
      const texts = await testTextsApi.getAll({
        difficulty: selectedDifficulty,
        limit: 10,
      });

      let selectedText: string;
      let selectedTestText: TestText | null = null;

      if (texts.length > 0) {
        // Select a random text from available texts
        const randomIndex = Math.floor(Math.random() * texts.length);
        selectedTestText = texts[randomIndex];
        selectedText = selectedTestText.content;
        setCurrentTestText(selectedTestText);
      } else {
        // Fallback to generated text
        selectedText = generateTestText(50);
        setCurrentTestText(null);
      }

      setTestText(selectedText);

      const newEngine = new TypingEngine(
        selectedText,
        (newStats) => setStats(newStats),
        (newState) => setState(newState)
      );

      setEngine(newEngine);
      setIsTestActive(true);

      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to initialize test:', error);
      // Fallback to generated text
      const fallbackText = generateTestText(50);
      setTestText(fallbackText);
      setCurrentTestText(null);

      const newEngine = new TypingEngine(
        fallbackText,
        (newStats) => setStats(newStats),
        (newState) => setState(newState)
      );

      setEngine(newEngine);
      setIsTestActive(true);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } finally {
      setIsLoadingTexts(false);
    }
  }, [selectedDifficulty]);

  // Submit test result
  const submitResult = useCallback(
    async (finalStats: TypingStats) => {
      if (!user || !currentTestText) {
        return; // Can't submit without user or test text
      }

      try {
        setIsSubmittingResult(true);
        await testResultsApi.submit({
          testTextId: currentTestText.id,
          wpm: finalStats.wpm,
          accuracy: finalStats.accuracy,
          errors: finalStats.incorrectChars,
          timeTaken: finalStats.timeElapsed,
        });
        console.log('Test result submitted successfully');
      } catch (error) {
        console.error('Failed to submit test result:', error);
      } finally {
        setIsSubmittingResult(false);
      }
    },
    [user, currentTestText]
  );

  // Reset test
  const resetTest = useCallback(() => {
    engine?.reset();
    setIsTestActive(true);
    inputRef.current?.focus();
  }, [engine]);

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!engine || !isTestActive) return;

      // Prevent default behavior for certain keys
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        return;
      }

      engine.handleKeyPress(e.key);

      // Check if test is complete
      if (engine.getState().isComplete) {
        setIsTestActive(false);
        // Submit result if user is logged in
        const finalStats = engine.calculateStats();
        submitResult(finalStats);
      }
    },
    [engine, isTestActive, submitResult]
  );

  // Initialize test on component mount
  useEffect(() => {
    initializeTest();
  }, [initializeTest]);

  // Render character with appropriate styling
  const renderCharacter = (char: string, index: number) => {
    if (!engine) return char;

    const status = engine.getCharacterStatus(index);
    let className = 'relative ';

    switch (status) {
      case 'correct':
        className +=
          'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
        break;
      case 'incorrect':
        className +=
          'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
        break;
      case 'current':
        className +=
          'text-gray-900 dark:text-white bg-blue-200 dark:bg-blue-800 animate-pulse';
        break;
      default:
        className += 'text-gray-500 dark:text-gray-400';
    }

    return (
      <span key={index} className={className}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    );
  };

  const progress = engine ? engine.getProgress() : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Typing Test
      </h1>

      {/* Difficulty Selector */}
      <div className="mb-6">
        <div className="flex justify-center items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Difficulty:
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            disabled={isTestActive}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {currentTestText && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              "{currentTestText.title}" ({currentTestText.wordCount} words)
            </span>
          )}
        </div>
      </div>

      {/* Stats Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.wpm}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">WPM</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.accuracy}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Accuracy
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatTime(stats.timeElapsed)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {Math.round(progress)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Progress
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Test Text Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
        <div className="text-xl leading-relaxed font-mono select-none">
          {testText
            .split('')
            .map((char, index) => renderCharacter(char, index))}
        </div>
      </div>

      {/* Hidden Input for Capturing Keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute -z-10"
        onKeyDown={handleKeyDown}
        disabled={!isTestActive}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {!isTestActive && !state.isComplete && (
          <button
            onClick={initializeTest}
            disabled={isLoadingTexts}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isLoadingTexts ? 'Loading...' : 'Start Test'}
          </button>
        )}

        {isTestActive && (
          <button
            onClick={resetTest}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reset
          </button>
        )}

        {state.isComplete && (
          <div className="flex space-x-4">
            <button
              onClick={initializeTest}
              disabled={isLoadingTexts}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isLoadingTexts ? 'Loading...' : 'New Test'}
            </button>
            <button
              onClick={resetTest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Result submission status */}
        {isSubmittingResult && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Saving result...
          </div>
        )}
      </div>

      {/* Test Complete Message */}
      {state.isComplete && (
        <div className="mt-8 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">
            Test Complete! 🎉
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-green-700 dark:text-green-300">
            <div>
              <div className="text-xl font-semibold">{stats.wpm}</div>
              <div className="text-sm">Words per minute</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{stats.accuracy}%</div>
              <div className="text-sm">Accuracy</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{stats.correctChars}</div>
              <div className="text-sm">Correct characters</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {formatTime(stats.timeElapsed)}
              </div>
              <div className="text-sm">Time taken</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!state.isStarted && isTestActive && (
        <div className="mt-6 text-center text-gray-600 dark:text-gray-400">
          <p>Click here and start typing to begin the test</p>
          <p className="text-sm mt-2">
            The timer will start automatically when you type the first character
          </p>
        </div>
      )}
    </div>
  );
};
