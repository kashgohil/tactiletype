import { TimelineChart } from "@/components/analytics/TimelineChart";
import { Stopwatch } from "@/components/stopwatch";
import { LiveStats } from "@/components/test/LiveStats";
import { TestPreferencesPanel } from "@/components/test/TestPreferencesPanel";
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
import {
  FONT_SIZE_CLASS,
  useTestPreferences,
} from "@/hooks/useTestPreferences";
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
import { saveGuestResult } from "../utils/guestResults";
import {
  playCompleteChime,
  playErrorBeep,
  playKeyClick,
} from "../utils/testSounds";
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
  const { prefs, setPrefs, resetPrefs } = useTestPreferences();
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

  // Submit test result (or stash for guests)
  const submitResult = useCallback(
    async (finalStats: TypingStats) => {
      if (!currentTestText || !engine || resultSubmitted) {
        return;
      }

      setResultSubmitted(true);

      if (prefs.soundEnabled || prefs.errorSoundEnabled) {
        playCompleteChime();
      }

      const keystrokeEvents = engine.getKeystrokeEvents();
      const keystrokeData = JSON.stringify(keystrokeEvents);
      const payload = {
        title: currentTestText.title,
        content: currentTestText.content,
        language: currentTestText.language,
        difficulty: currentTestText.difficulty,
        wordCount: currentTestText.wordCount,
        mode: currentMode,
        testType: currentType,
        modeTarget: currentMode === "timer" ? timerDuration : wordsCount,
        exerciseKind: practiceMeta?.exerciseKind,
        exercisePackId: practiceMeta?.exercisePackId,
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        errors: finalStats.incorrectChars,
        timeTaken: Math.max(1, finalStats.timeElapsed),
        keystrokeData,
      };

      // Guest: keep last N results locally; merge on login/register
      if (!user) {
        saveGuestResult(payload);
        return;
      }

      try {
        const response = await testResultsApi.submit(payload);

        if (response.result?.id) {
          try {
            await analyticsApi.processTestResult(response.result.id);
          } catch (analyticsError) {
            console.error("Failed to process analytics:", analyticsError);
          }
        }
      } catch (error) {
        console.error("Failed to submit test result:", error);
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
      prefs.soundEnabled,
      prefs.errorSoundEnabled,
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

      const errorsBefore = engine.getState().errors.size;
      engine.handleKeyPress(e.key);

      if (e.key.length === 1) {
        const errorsAfter = engine.getState().errors.size;
        if (errorsAfter > errorsBefore) {
          if (prefs.errorSoundEnabled) playErrorBeep();
        } else if (prefs.soundEnabled) {
          playKeyClick();
        }
      }

      // Check if test is complete
      if (engine.getState().isComplete && currentMode === "words") {
        setIsTestActive(false);
        const finalStats = engine.calculateStats();
        submitResult(finalStats);
      }
    },
    [
      engine,
      isTestActive,
      currentMode,
      submitResult,
      prefs.soundEnabled,
      prefs.errorSoundEnabled,
    ],
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

  // Render character — clear typed vs untyped distinction
  const renderCharacter = (char: string, index: number) => {
    if (!engine) return char;

    const status = engine.getCharacterStatus(index);
    const hi = prefs.highContrastTyped;

    let className = "relative inline-block ";
    switch (status) {
      case "correct":
        // Typed correct: full opacity + underline trail so progress is obvious
        className += hi
          ? "text-text opacity-100 border-b-2 border-accent/70"
          : "text-text bg-accent/40";
        break;
      case "incorrect":
        className +=
          "text-rose-500 bg-rose-500/15 border-b-2 border-rose-500/80";
        break;
      case "current":
        className += hi ? "text-text/45" : "text-text/50";
        break;
      default:
        // Untyped: dimmer, no underline
        className += hi ? "text-text/35" : "text-text/50";
    }

    const isCaret = state.currentIndex === index && !state.isComplete;
    const caretTransition = prefs.smoothCaret
      ? { type: "spring" as const, stiffness: 500, damping: 35, mass: 0.4 }
      : { duration: 0 };

    let caretNode: React.ReactNode = null;
    if (isCaret) {
      const base =
        "absolute pointer-events-none z-[1] " +
        (prefs.smoothCaret ? "" : "animate-pulse ");
      switch (prefs.caretStyle) {
        case "block":
          caretNode = (
            <motion.div
              layoutId="cursor"
              transition={caretTransition}
              className={cn(base, "inset-0 bg-accent/35 rounded-sm")}
            />
          );
          break;
        case "underline":
          caretNode = (
            <motion.div
              layoutId="cursor"
              transition={caretTransition}
              className={cn(
                base,
                "left-0 right-0 bottom-0 h-0.5 bg-accent",
              )}
            />
          );
          break;
        case "box":
          caretNode = (
            <motion.div
              layoutId="cursor"
              transition={caretTransition}
              className={cn(
                base,
                "inset-0 border-2 border-accent rounded-sm",
              )}
            />
          );
          break;
        case "line":
        default:
          caretNode = (
            <motion.div
              layoutId="cursor"
              transition={caretTransition}
              className={cn(
                base,
                "inset-y-0 left-0 w-0.5 bg-accent",
              )}
            />
          );
      }
    }

    return (
      <div
        key={index}
        className={cn(
          className,
          prefs.smoothCaret
            ? "transition-colors duration-150"
            : "transition-none",
        )}
      >
        {char === " " ? "\u00A0" : char}
        {caretNode}
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
                  <LiveStats stats={stats} hidden={prefs.hideLiveStats} />
                  <div className="absolute right-0 flex items-center gap-1">
                    <TestPreferencesPanel
                      prefs={prefs}
                      onChange={setPrefs}
                      onReset={resetPrefs}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={resetTest}
                        >
                          <RotateCcw />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Refresh</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 h-9 flex-wrap">
                    {availableTypes.map(({ id, icon: Icon, label }) => (
                      <Tooltip key={id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
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
                      <Tooltip key={id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
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
                    <TestPreferencesPanel
                      prefs={prefs}
                      onChange={setPrefs}
                      onReset={resetPrefs}
                    />
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
              className={cn(
                "p-8 mt-4 mb-6 flex flex-wrap leading-relaxed font-mono select-none outline-none relative max-h-[50vh] overflow-y-auto tracking-wide",
                FONT_SIZE_CLASS[prefs.fontSize],
              )}
              onKeyDown={handleKeyDown}
              onBlur={() => setFocused(false)}
              onFocus={() => setFocused(true)}
              tabIndex={0}
              ref={inputRef}
              data-keyboard-layout={prefs.keyboardLayout}
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
            <div className="bg-accent/30 rounded-lg p-6 text-center w-full max-w-2xl">
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
              {!user && (
                <p className="text-xs text-text/50 mt-4">
                  Result saved on this device.{" "}
                  <a href="/login" className="text-accent hover:underline">
                    Log in
                  </a>{" "}
                  to sync to your profile.
                </p>
              )}
            </div>

            <Button onClick={resetTest}>Reset</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
