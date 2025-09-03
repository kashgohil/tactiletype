import { Stopwatch } from '@/components/stopwatch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Difficulty, TestMode, TestType } from '@tactile/types';
import {
  ALargeSmall,
  AtSign,
  Hash,
  Quote,
  RotateCcw,
  Timer,
  WholeWord,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts';
import type { TestText } from '../services/api';
import { testResultsApi } from '../services/api';
import type { TypingState, TypingStats } from '../utils/typingEngine';
import {
  TypingEngine,
  formatTime,
  initializeText,
  isNonPrintingKey,
} from '../utils/typingEngine';

const TimerOptions = [10, 15, 30, 60];
const wordsOptions = [25, 50, 75, 100, 200];

const Difficulties: Record<Difficulty, { id: Difficulty; label: string }> = {
  easy: { id: 'easy', label: 'Easy' },
  medium: { id: 'medium', label: 'Medium' },
  hard: { id: 'hard', label: 'Hard' },
};

const Types: Record<
  TestType,
  { id: TestType; label: string; icon: LucideIcon }
> = {
  text: { id: 'text', label: 'Text', icon: ALargeSmall },
  punctuation: { id: 'punctuation', label: 'Punctuation', icon: AtSign },
  numbers: { id: 'numbers', label: 'Numbers', icon: Hash },
  quotes: { id: 'quotes', label: 'Quotes', icon: Quote },
};

const Modes: Record<
  TestMode,
  { id: TestMode; label: string; icon: LucideIcon }
> = {
  timer: { id: 'timer', label: 'Timer', icon: Timer },
  words: { id: 'words', label: 'Words', icon: WholeWord },
};

export const TypingTest: React.FC = () => {
  const { user } = useAuth();

  const [wordsCount, setWordsCount] = useState(wordsOptions[0]);
  const [timerDuration, setTimerDuration] = useState(TimerOptions[0]);
  const [currentMode, setCurrentMode] = useState<TestMode>('timer');
  const [currentType, setCurrentType] = useState<TestType>('text');
  const [focused, setFocused] = useState(true);
  const [testText, setTestText] = useState('');
  const [currentTestText] = useState<TestText | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
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
  const initializeTest = useCallback(() => {
    const selectedText = initializeText(
      currentType,
      currentMode,
      timerDuration,
      wordsCount,
      difficulty
    );

    setTestText(selectedText);

    const newEngine = new TypingEngine(
      selectedText,
      (newStats) => setStats(newStats),
      (newState) => setState(newState)
    );

    setEngine(newEngine);
  }, [currentType, currentMode, wordsCount, timerDuration, difficulty]);

  // Submit test result
  const submitResult = useCallback(
    async (finalStats: TypingStats) => {
      if (!user || !currentTestText || !engine) {
        return; // Can't submit without user, test text, or engine
      }

      try {
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
      }
    },
    [user, currentTestText, engine]
  );

  // Timer end handler
  const handleTimerEnd = useCallback(() => {
    if (engine && !engine.getState().isComplete) {
      // Complete the test when timer runs out
      engine.completeTest();
      setIsTestActive(false);
      const finalStats = engine.calculateStats();
      submitResult(finalStats);
    }
  }, [engine, submitResult]);

  // Reset test
  const resetTest = useCallback(() => {
    engine?.reset();
    setIsTestActive(false);
    inputRef.current?.focus();
  }, [engine]);

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!engine) return;

      e.preventDefault();
      if (!isTestActive && !isNonPrintingKey(e.key)) {
        setIsTestActive(true);
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

  // Centralized focus restoration for configuration changes
  useEffect(() => {
    // Focus the typing test container whenever any configuration changes
    inputRef.current?.focus();
  }, [currentType, currentMode, timerDuration, wordsCount, difficulty]);

  // Render character with appropriate styling
  const renderCharacter = (char: string, index: number) => {
    if (!engine) return char;

    const status = engine.getCharacterStatus(index);
    let className = 'relative ';

    switch (status) {
      case 'correct':
        className += 'text-text';
        break;
      case 'incorrect':
        className += 'text-rose-500';
        break;
      case 'current':
        className += 'text-gray-400';
        break;
      default:
        className += 'text-gray-400';
    }

    return (
      <div
        key={index}
        className={cn(className, 'relative transition-colors duration-200')}
      >
        {char === ' ' ? '\u00A0' : char}
        {state.currentIndex === index ? (
          <motion.div
            layoutId="cursor"
            transition={{ delay: 0, duration: 0.2 }}
            className="absolute inset-0 border-l-3 border-accent animate-pulse"
          />
        ) : null}
      </div>
    );
  };

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
      <AnimatePresence mode="wait">
        {!state.isComplete ? (
          <motion.div
            key="typing-test"
            className="bg-accent/30 rounded-lg w-full"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -50 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="flex items-center justify-between p-8 rounded-lg text-zinc-700 gap-2 w-full">
              {isTestActive ? (
                <div className="h-9 text-xl flex items-center justify-center w-full gap-2">
                  {currentMode === 'timer' && (
                    <Stopwatch
                      duration={timerDuration}
                      onEnd={handleTimerEnd}
                    />
                  )}
                  {currentMode === 'words' && (
                    <span>
                      {engine?.getCompletedWords() || 0} / {wordsCount} words
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 h-9">
                    {Object.values(Types).map(({ id, icon: Icon, label }) => (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            key={id}
                            onClick={() => {
                              setCurrentType(id);
                              inputRef.current?.focus();
                            }}
                            size="icon"
                            className={id === currentType ? 'bg-accent/50' : ''}
                          >
                            <Icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{label}</TooltipContent>
                      </Tooltip>
                    ))}
                    <Separator orientation="vertical" className="mx-4" />
                    {Object.values(Modes).map(({ id, icon: Icon, label }) => (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            key={id}
                            onClick={() => {
                              setCurrentMode(id);
                              inputRef.current?.focus();
                            }}
                            size="icon"
                            className={id === currentMode ? 'bg-accent/50' : ''}
                          >
                            <Icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{label}</TooltipContent>
                      </Tooltip>
                    ))}
                    <Separator orientation="vertical" className="mx-4" />
                    {currentMode === 'timer' && (
                      <Select
                        value={String(timerDuration)}
                        onValueChange={(value) => {
                          setTimerDuration(parseInt(value));
                          inputRef.current?.focus();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue className="capitalize">
                            {timerDuration} s
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TimerOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option} s
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {currentMode === 'words' && (
                      <Select
                        value={String(wordsCount)}
                        onValueChange={(value) => {
                          setWordsCount(parseInt(value));
                          inputRef.current?.focus();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue className="capitalize">
                            {wordsCount} words
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {wordsOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option} words
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={difficulty}
                      onValueChange={(dif: Difficulty) => {
                        setDifficulty(dif);
                        inputRef.current?.focus();
                      }}
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
                </>
              )}
            </div>

            <div
              className="p-8 mt-4 mb-6 flex flex-wrap text-3xl leading-relaxed font-mono select-none outline-none relative max-h-[50vh] overflow-y-auto"
              onKeyDown={handleKeyDown}
              onBlur={() => setFocused(false)}
              onFocus={() => setFocused(true)}
              tabIndex={0}
              ref={inputRef}
            >
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all delay-300 text-center backdrop-blur-none opacity-0 z-1',
                  !focused && 'backdrop-blur-sm opacity-100'
                )}
              >
                Click here to focus
              </div>

              {text()}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="test-completed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: '-20%' }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-accent/30 border border-accent rounded-lg p-6 text-center"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <h2 className="text-2xl font-bold mb-4">Test Complete!</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xl font-semibold">{stats.wpm}</div>
                <div className="text-sm">Words per minute</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.accuracy}%</div>
                <div className="text-sm">Accuracy</div>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {stats.correctChars}
                </div>
                <div className="text-sm">Correct characters</div>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {formatTime(stats.timeElapsed)}
                </div>
                <div className="text-sm">Time taken</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
