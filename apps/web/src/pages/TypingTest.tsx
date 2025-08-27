import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ALargeSmall,
  AtSign,
  Hash,
  Quote,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts';
import type { TestText } from '../services/api';
import { testResultsApi } from '../services/api';
import type { TypingState, TypingStats } from '../utils/typingEngine';
import {
  TypingEngine,
  formatTime,
  generateTestText,
} from '../utils/typingEngine';

type Mode = 'text' | 'punctuation' | 'numbers' | 'quotes';
type Difficulty = 'easy' | 'medium' | 'hard';

const Difficulties: Record<Difficulty, { id: Difficulty; label: string }> = {
  easy: { id: 'easy', label: 'Easy' },
  medium: { id: 'medium', label: 'Medium' },
  hard: { id: 'hard', label: 'Hard' },
};

const Modes: Record<Mode, { id: Mode; label: string; icon: LucideIcon }> = {
  text: { id: 'text', label: 'Text', icon: ALargeSmall },
  punctuation: { id: 'punctuation', label: 'Punctuation', icon: AtSign },
  numbers: { id: 'numbers', label: 'Numbers', icon: Hash },
  quotes: { id: 'quotes', label: 'Quotes', icon: Quote },
};

export const TypingTest: React.FC = () => {
  const { user } = useAuth();

  const [currentMode, setCurrentMode] = useState<Mode>('text');
  const [focused, setFocused] = useState(true);
  const [testText, setTestText] = useState('');
  const [currentTestText] = useState<TestText | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
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
    keystrokeEvents: [],
  });
  const [isTestActive, setIsTestActive] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize test with API text or fallback
  const initializeTest = useCallback(async () => {
    const selectedText = generateTestText(100);
    setTestText(selectedText);

    const newEngine = new TypingEngine(
      selectedText,
      (newStats) => setStats(newStats),
      (newState) => setState(newState)
    );

    setEngine(newEngine);
    setIsTestActive(true);
  }, []);

  // Submit test result
  const submitResult = useCallback(
    async (finalStats: TypingStats) => {
      if (!user || !currentTestText || !engine) {
        return; // Can't submit without user, test text, or engine
      }

      try {
        setIsSubmittingResult(true);

        // Get detailed keystroke data for analytics
        const keystrokeEvents = engine.getKeystrokeEvents();
        const keystrokeData = JSON.stringify(keystrokeEvents);

        await testResultsApi.submit({
          testTextId: currentTestText.id,
          wpm: finalStats.wpm,
          accuracy: finalStats.accuracy,
          errors: finalStats.incorrectChars,
          timeTaken: finalStats.timeElapsed,
          keystrokeData, // Include detailed keystroke data
        });
        console.log('Test result submitted successfully with analytics data');
      } catch (error) {
        console.error('Failed to submit test result:', error);
      } finally {
        setIsSubmittingResult(false);
      }
    },
    [user, currentTestText, engine]
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
    inputRef.current?.focus();
  }, [initializeTest]);

  // Render character with appropriate styling
  const renderCharacter = (char: string, index: number) => {
    if (!engine) return char;

    const status = engine.getCharacterStatus(index);
    let className = 'relative ';

    switch (status) {
      case 'correct':
        className += 'text-text bg-accent/50';
        break;
      case 'incorrect':
        className += 'text-rose-500 bg-accent/50';
        break;
      case 'current':
        className += 'text-gray-500 bg-accent animate-pulse';
        break;
      default:
        className += 'text-gray-400';
    }

    return (
      <span key={index} className={cn(className)}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    );
  };

  const progress = engine ? engine.getProgress() : 0;

  function testStats() {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-ro">
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
    );
  }

  function text() {
    let counter = 0;
    const chunks = testText.split(' ');
    return chunks.map((word, wordIndex) => {
      return (
        <div className="flex items-center" key={wordIndex}>
          {word.split('').map((char) => {
            return renderCharacter(char, counter++);
          })}
          {wordIndex < chunks.length - 1 && renderCharacter(' ', counter++)}
        </div>
      );
    });
  }

  return (
    <div className="h-full flex flex-col gap-4 items-center justify-center">
      <div className="bg-accent/30 rounded-lg w-full -translate-y-20">
        <div className="flex items-center justify-between p-8 rounded-lg text-zinc-700 gap-2 w-full">
          <div className="flex items-center gap-2">
            {Object.values(Modes).map(({ id, icon: Icon, label }) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    key={id}
                    onClick={() => setCurrentMode(id)}
                    size="icon"
                    className={id === currentMode ? 'bg-accent/50' : ''}
                  >
                    <Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={difficulty}
              onValueChange={(dif: Difficulty) => setDifficulty(dif)}
            >
              <SelectTrigger>
                <SelectValue className="capitalize">
                  {Difficulties[difficulty]?.label || difficulty}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(Difficulties).map((difficulty) => (
                  <SelectItem key={difficulty.id} value={difficulty.id}>
                    {difficulty.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={resetTest}>
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div
          className="p-8 mt-4 mb-6 flex flex-wrap text-3xl leading-relaxed font-mono select-none outline-none relative"
          onKeyDown={handleKeyDown}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          tabIndex={0}
          ref={inputRef}
        >
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all text-center backdrop-blur-none opacity-0 z-1',
              !focused && 'backdrop-blur-sm opacity-100'
            )}
          >
            Click here to focus
          </div>

          {text()}
          {/* {testText.split(' ').map((word, wordIndex) => (
            <div className="flex items-center px-2" key={wordIndex}>
              {word
                .split('')
                .map((char, index) =>
                  renderCharacter(char, parseInt(`${wordIndex}${index}`))
                )}
            </div>
          ))} */}
          {/* {testText
            .split('')
            .map((char, index) => renderCharacter(char, index))} */}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        {/* Result submission status */}
        {isSubmittingResult && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Saving result...
          </div>
        )}
      </div>

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
    </div>
  );
};
