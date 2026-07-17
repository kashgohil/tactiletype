import { TimelineChart } from "@/components/analytics/TimelineChart";
import { Stopwatch } from "@/components/stopwatch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Difficulty, TestMode, TestType } from "@tactile/types";
import { useSearch } from "@tanstack/react-router";
import {
  ALargeSmall,
  AtSign,
  Braces,
  Hash,
  Quote,
  RotateCcw,
  Sigma,
  Timer,
  WholeWord,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts";
import { analyticsApi } from "../services/analyticsApi";
import type { TestText } from "../services/api";
import { testResultsApi } from "../services/api";
import type { TypingState, TypingStats } from "../utils/typingEngine";
import {
  TypingEngine,
  formatTime,
  initializeText,
  isNonPrintingKey,
} from "../utils/typingEngine";

type PracticeDrillPayload = {
  content: string;
  title: string;
  exerciseKind?: string;
  exercisePackId?: string;
};

function readPracticeDrill(): PracticeDrillPayload | null {
  try {
    const raw = sessionStorage.getItem("tactile_practice_drill");
    if (!raw) return null;
    sessionStorage.removeItem("tactile_practice_drill");
    return JSON.parse(raw) as PracticeDrillPayload;
  } catch {
    return null;
  }
}

const TimerOptions = [10, 15, 30, 60];
const wordsOptions = [25, 50, 75, 100, 200];

const Difficulties: Record<Difficulty, { id: Difficulty; label: string }> = {
  easy: { id: "easy", label: "Easy" },
  medium: { id: "medium", label: "Medium" },
  hard: { id: "hard", label: "Hard" },
};

const Types: Record<
  TestType,
  { id: TestType; label: string; icon: LucideIcon; available?: boolean }
> = {
  text: { id: "text", label: "Text", icon: ALargeSmall, available: true },
  punctuation: {
    id: "punctuation",
    label: "Punctuation",
    icon: AtSign,
    available: true,
  },
  numbers: { id: "numbers", label: "Numbers", icon: Hash, available: true },
  quotes: { id: "quotes", label: "Quotes", icon: Quote, available: true },
  code: { id: "code", label: "Code", icon: Braces, available: true },
  symbols: { id: "symbols", label: "Symbols", icon: Sigma, available: true },
};

const availableTypes = Object.values(Types).filter((t) => t.available !== false);

const Modes: Record<
  TestMode,
  { id: TestMode; label: string; icon: LucideIcon }
> = {
  timer: { id: "timer", label: "Timer", icon: Timer },
  words: { id: "words", label: "Words", icon: WholeWord },
};

export const TypingTest: React.FC = () => {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as {
    practice?: string;
    type?: string;
    mode?: string;
    duration?: string;
  };

  const initialType = (["text", "punctuation", "numbers", "quotes", "code", "symbols"].includes(
    search.type ?? "",
  )
    ? search.type
    : "text") as TestType;
  const initialMode = (search.mode === "words" ? "words" : "timer") as TestMode;
  const initialDuration = search.duration
    ? Number(search.duration) || TimerOptions[0]
    : TimerOptions[0];

  const [wordsCount, setWordsCount] = useState(wordsOptions[0]);
  const [timerDuration, setTimerDuration] = useState(
    TimerOptions.includes(initialDuration) ? initialDuration : TimerOptions[0],
  );
  const [currentMode, setCurrentMode] = useState<TestMode>(initialMode);
  const [currentType, setCurrentType] = useState<TestType>(initialType);
  const [focused, setFocused] = useState(true);
  const [testText, setTestText] = useState("");
  const [currentTestText, setCurrentTestText] = useState<TestText | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [engine, setEngine] = useState<TypingEngine | null>(null);
  const [practiceMeta, setPracticeMeta] = useState<{
    exerciseKind?: string;
    exercisePackId?: string;
  } | null>(null);
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
    userInput: "",
    errors: new Set(),
    startTime: null,
    endTime: null,
    isComplete: false,
    isStarted: false,
    keystrokeEvents: [],
  });
  const [isTestActive, setIsTestActive] = useState(false);
  const [resultSubmitted, setResultSubmitted] = useState(false);
  const practiceConsumed = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize test with generated text (or practice drill once)
  const initializeTest = useCallback(
    (callback?: (engine: TypingEngine) => void) => {
      let selectedText: string;
      let title = `${currentType} test - ${difficulty}`;
      let meta: { exerciseKind?: string; exercisePackId?: string } | null =
        null;

      if (!practiceConsumed.current && search.practice === "1") {
        const drill = readPracticeDrill();
        if (drill?.content) {
          practiceConsumed.current = true;
          selectedText = drill.content;
          title = drill.title;
          meta = {
            exerciseKind: drill.exerciseKind,
            exercisePackId: drill.exercisePackId,
          };
          setPracticeMeta(meta);
        } else {
          selectedText = initializeText(
            currentType,
            currentMode,
            timerDuration,
            wordsCount,
            difficulty,
          );
        }
      } else {
        selectedText = initializeText(
          currentType,
          currentMode,
          timerDuration,
          wordsCount,
          difficulty,
        );
        setPracticeMeta(null);
      }

      setTestText(selectedText);

      const tempTestText: TestText = {
        id: "temp-" + Date.now(),
        title,
        content: selectedText,
        language: "en",
        difficulty: difficulty,
        wordCount: selectedText.split(" ").length,
        createdAt: new Date().toISOString(),
      };

      setCurrentTestText(tempTestText);
      setResultSubmitted(false);

      const newEngine = new TypingEngine(
        selectedText,
        (newStats) => setStats(newStats),
        (newState) => setState(newState),
      );

      callback?.(newEngine);

      setEngine(newEngine);
    },
    [
      currentType,
      currentMode,
      wordsCount,
      timerDuration,
      difficulty,
      search.practice,
    ],
  );

  // Submit test result
  const submitResult = useCallback(
    async (finalStats: TypingStats) => {
      if (!user || !currentTestText || !engine || resultSubmitted) {
        return; // Can't submit without user, test text, or engine, or if already submitted
      }

      setResultSubmitted(true);

      try {
        // Get detailed keystroke data for analytics
        const keystrokeEvents = engine.getKeystrokeEvents();
        const keystrokeData = JSON.stringify(keystrokeEvents);

        // Submit test result with embedded test text data + session metadata
        const response = await testResultsApi.submit({
          // Test text data
          title: currentTestText.title,
          content: currentTestText.content,
          language: currentTestText.language,
          difficulty: currentTestText.difficulty,
          wordCount: currentTestText.wordCount,
          // Session metadata
          mode: currentMode,
          testType: currentType,
          modeTarget:
            currentMode === "timer" ? timerDuration : wordsCount,
          exerciseKind: practiceMeta?.exerciseKind,
          exercisePackId: practiceMeta?.exercisePackId,
          // Test results data
          wpm: finalStats.wpm,
          accuracy: finalStats.accuracy,
          errors: finalStats.incorrectChars,
          timeTaken: finalStats.timeElapsed,
          keystrokeData, // Include detailed keystroke data
        });

        console.log(
          "Test result submitted successfully with embedded test text data",
        );

        // Process analytics data if submission was successful
        if (response.result?.id) {
          try {
            await analyticsApi.processTestResult(response.result.id);
            console.log("Analytics processing initiated successfully");
          } catch (analyticsError) {
            console.error("Failed to process analytics:", analyticsError);
            // Don't fail the entire submission if analytics processing fails
          }
        }
      } catch (error) {
        console.error("Failed to submit test result:", error);
        // Reset the flag if submission failed so user can retry
        setResultSubmitted(false);
      }
    },
    [
      user,
      currentTestText,
      engine,
      resultSubmitted,
      currentMode,
      currentType,
      timerDuration,
      wordsCount,
      practiceMeta,
    ],
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
    initializeTest((engine) => engine.reset());
    setIsTestActive(false);
  }, [initializeTest]);

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
      if (engine.getState().isComplete && currentMode === "words") {
        setIsTestActive(false);
        // Submit result if user is logged in
        const finalStats = engine.calculateStats();
        submitResult(finalStats);
      }
    },
    [engine, isTestActive, currentMode, submitResult],
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
    let className = "relative ";

    switch (status) {
      case "correct":
        className += "text-text bg-accent/50";
        break;
      case "incorrect":
        className += "text-rose-500";
        break;
      case "current":
        className += "text-text/50";
        break;
      default:
        className += "text-text/50";
    }

    return (
      <div
        key={index}
        className={cn(className, "relative transition-colors duration-200")}
      >
        {char === " " ? "\u00A0" : char}
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
    const chunks = testText.split(" ");
    return chunks.map((word, wordIndex) => {
      return (
        <div className="flex items-center" key={wordIndex}>
          {word.split("").map((char) => {
            return renderCharacter(char, counter++);
          })}
          {wordIndex < chunks.length - 1 && renderCharacter(" ", counter++)}
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (!state.isComplete && !isTestActive) {
                inputRef.current?.focus();
              }
            }}
          >
            <div className="flex items-center justify-between p-8 rounded-lg gap-2 w-full">
              {isTestActive ? (
                <div className="h-9 text-xl flex items-center justify-center w-full gap-2 relative">
                  {currentMode === "timer" && state.startTime && (
                    <Stopwatch
                      duration={timerDuration}
                      onEnd={handleTimerEnd}
                      startTime={state.startTime}
                    />
                  )}
                  {currentMode === "words" && (
                    <span>
                      {engine?.getCompletedWords() || 0} / {wordsCount} words
                    </span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetTest}
                        className="absolute right-0"
                      >
                        <RotateCcw />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Refresh</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 h-9">
                    {availableTypes.map(({ id, icon: Icon, label }) => (
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
                            className={id === currentType ? "bg-accent/50" : ""}
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
                            className={id === currentMode ? "bg-accent/50" : ""}
                          >
                            <Icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{label}</TooltipContent>
                      </Tooltip>
                    ))}
                    <Separator orientation="vertical" className="mx-4" />
                    {currentMode === "timer" && (
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
                    {currentMode === "words" && (
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
                  "absolute inset-0 flex items-center justify-center transition-all delay-300 text-center backdrop-blur-none opacity-0 z-1",
                  !focused && "backdrop-blur-sm opacity-100",
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
            animate={{ opacity: 1, y: "-20%" }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-4 items-center w-full"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <TimelineChart
              keystrokeEvents={state.keystrokeEvents}
              height={300}
            />
            <div className="bg-accent/30 rounded-lg p-6 text-center">
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
            </div>

            <Button onClick={resetTest}>Reset</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
