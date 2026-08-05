import { TimelineChart } from "@/components/analytics/TimelineChart";
import { Stopwatch } from "@/components/stopwatch";
import { CustomPasteModal } from "@/components/test/CustomPasteModal";
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
import { TypingSurface } from "@/components/test/TypingSurface";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useTestPreferences } from "@/hooks/useTestPreferences";
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../contexts";
import { analyticsApi } from "../services/analyticsApi";
import type { TestText } from "../services/api";
import { testResultsApi } from "../services/api";
import { tokenizeCodeChars } from "../utils/codeHighlight";
import { saveGuestResult } from "../utils/guestResults";
import { ResultsSummary } from "@/components/test/ResultsSummary";
import {
  playCompleteChime,
  playErrorBeep,
  playKeyClick,
} from "../utils/testSounds";
import type { TypingState, TypingStats } from "../utils/typingEngine";
import {
  TypingEngine,
  initializeText,
  isNonPrintingKey,
} from "../utils/typingEngine";
import { recordFromKeystrokes, recordKeyAttempt } from "../utils/weakKeys";
import { toast } from "sonner";

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
  // Reachable via ?type=code / ?type=symbols and the play modes, but kept out
  // of the toolbar so it matches the four-type row.
  code: { id: "code", label: "Code", icon: Braces, available: false },
  symbols: { id: "symbols", label: "Symbols", icon: Sigma, available: false },
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
  const { prefs } = useTestPreferences();
  const reducedMotion = usePrefersReducedMotion();
  const search = useSearch({ strict: false }) as {
    practice?: string;
    type?: string;
    mode?: string;
    duration?: string;
    paste?: string;
  };
  const [pasteOpen, setPasteOpen] = useState(search.paste === "1");

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

  // Personal best is still tracked for the record even though the results
  // card no longer surfaces it.
  const bestComputedRef = useRef(false);

  const inputRef = useRef<HTMLDivElement | null>(null);

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
      recordFromKeystrokes(keystrokeEvents);
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

      const send = async (): Promise<void> => {
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
          // A fixed id keeps a burst of failures to a single toast, and the run
          // is recoverable from here — the stats are still in hand.
          toast.error("Result not saved", {
            id: "test-result-submit-failed",
            description:
              "We could not reach the server. This run is missing from your history.",
            action: { label: "Retry", onClick: () => void send() },
          });
        }
      };

      await send();
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
    bestComputedRef.current = false;
  }, [initializeTest]);

  // When a test completes: record the personal best exactly once
  useEffect(() => {
    if (!state.isComplete) {
      bestComputedRef.current = false;
      return;
    }
    if (bestComputedRef.current) return;
    bestComputedRef.current = true;

    const stored = Number(localStorage.getItem("tactile-best-wpm"));
    const prev = Number.isFinite(stored) && stored > 0 ? stored : null;
    if (prev === null || stats.wpm > prev) {
      localStorage.setItem("tactile-best-wpm", String(stats.wpm));
    }
  }, [state.isComplete, stats.wpm]);

  // On the results screen, Enter starts the next test (Monkeytype muscle memory)
  useEffect(() => {
    if (!state.isComplete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        resetTest();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.isComplete, resetTest]);

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!engine) return;

      e.preventDefault();
      if (!isTestActive && !isNonPrintingKey(e.key)) {
        setIsTestActive(true);
      }

      const errorsBefore = engine.getState().errors.size;
      const indexBefore = engine.getState().currentIndex;
      const text = engine.getText();
      engine.handleKeyPress(e.key);

      if (e.key.length === 1) {
        const expected = text[indexBefore];
        const errorsAfter = engine.getState().errors.size;
        const madeError = errorsAfter > errorsBefore;
        if (expected) {
          recordKeyAttempt(expected, !madeError);
        }
        if (madeError) {
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

  const codeTokens = useMemo(
    () =>
      currentType === "code" ? tokenizeCodeChars(testText) : null,
    [currentType, testText],
  );

  // The January panel drifted up as it settled; keep that, minus the travel
  // when the user asked for reduced motion.
  const panelMotion = reducedMotion
    ? {
        initial: false as const,
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
      }
    : {
        initial: { opacity: 0, y: 0 },
        animate: { opacity: 1, y: -50 },
        exit: { opacity: 0, y: -60 },
      };

  const resultsMotion = reducedMotion
    ? {
        initial: false as const,
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: "-20%" },
        exit: { opacity: 0, y: 20 },
      };

  return (
    <div className="h-full flex flex-col gap-4 items-center justify-center">
      <CustomPasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onStart={(content, title) => {
          setPracticeMeta({
            exerciseKind: "custom_paste",
            exercisePackId: "playlist-local",
          });
          setTestText(content);
          setCurrentTestText({
            id: "custom-" + Date.now(),
            title,
            content,
            language: "en",
            difficulty,
            wordCount: content.split(/\s+/).filter(Boolean).length,
            createdAt: new Date().toISOString(),
          });
          setResultSubmitted(false);
          setIsTestActive(false);
          const newEngine = new TypingEngine(
            content,
            (newStats) => setStats(newStats),
            (newState) => setState(newState),
          );
          setEngine(newEngine);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      />
      <AnimatePresence mode="wait">
        {!state.isComplete ? (
          <motion.div
            key="typing-test"
            className="bg-accent/30 rounded-lg w-full"
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            exit={panelMotion.exit}
            transition={{
              duration: reducedMotion ? 0 : 0.3,
              ease: "easeInOut",
            }}
            data-allow-transform-motion=""
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

            <TypingSurface
              text={testText}
              getStatus={(i) => engine?.getCharacterStatus(i) ?? "pending"}
              caretIndex={state.isComplete ? null : state.currentIndex}
              onKeyDown={handleKeyDown}
              surfaceRef={inputRef}
              codeTokens={codeTokens}
            />
          </motion.div>
        ) : (
          <motion.div
            key="test-completed"
            initial={resultsMotion.initial}
            animate={resultsMotion.animate}
            exit={resultsMotion.exit}
            className="flex flex-col gap-4 items-center w-full"
            transition={{
              duration: reducedMotion ? 0 : 0.3,
              ease: "easeInOut",
            }}
            data-allow-transform-motion=""
          >
            <TimelineChart
              keystrokeEvents={state.keystrokeEvents}
              height={300}
            />
            <ResultsSummary stats={stats} onRestart={resetTest} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
