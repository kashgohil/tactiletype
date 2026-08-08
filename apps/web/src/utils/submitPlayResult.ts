import { toast } from 'sonner';
import { analyticsApi } from '@/services/analyticsApi';
import { testResultsApi } from '@/services/api';
import {
  clearDailyRun,
  isActiveDailyForMode,
  peekDailyRun,
  saveLocalDailyModeScore,
} from '@/utils/dailyRun';
import { saveGuestResult } from '@/utils/guestResults';
import type { PlayModeId } from '@/utils/playModes';
import { savePlayBest } from '@/utils/playModes';

export interface PlayResultPayload {
  modeId: PlayModeId;
  title: string;
  content: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  wordCount: number;
  /** Mode-specific score for personal bests */
  score: number;
  scoreLabel: string;
}

/**
 * Persist a play-mode run the same way as a normal test so profile/analytics
 * still see it, tagged with exerciseKind = the mode id.
 * If this session was started as the daily mode, tag as `daily_mode` instead.
 */
export async function submitPlayResult(
  payload: PlayResultPayload,
  isLoggedIn: boolean
): Promise<void> {
  const daily = isActiveDailyForMode(payload.modeId) ? peekDailyRun() : null;

  const exerciseKind = daily ? 'daily_mode' : payload.modeId;
  const exercisePackId = daily ? daily.exercisePackId : `play-${payload.modeId}`;
  const title = daily
    ? `Daily mode · ${payload.title.replace(/^Daily mode · /, '')}`
    : payload.title;

  const body = {
    title,
    content: payload.content,
    language: 'en' as const,
    difficulty: 'medium' as const,
    wordCount: payload.wordCount,
    mode: 'words' as const,
    testType: 'text' as const,
    modeTarget: payload.wordCount,
    exerciseKind,
    exercisePackId,
    wpm: payload.wpm,
    accuracy: payload.accuracy,
    errors: payload.errors,
    timeTaken: Math.max(1, payload.timeTaken),
  };

  // Local bests for the mode itself
  savePlayBest(payload.modeId, payload.score, payload.scoreLabel);

  if (daily) {
    saveLocalDailyModeScore({
      date: daily.date,
      modeId: daily.modeId,
      wpm: payload.wpm,
      accuracy: payload.accuracy,
      score: payload.score,
      label: payload.scoreLabel,
    });
    clearDailyRun();
  }

  if (!isLoggedIn) {
    saveGuestResult(body);
    return;
  }

  try {
    const response = await testResultsApi.submit(body);
    if (response.result?.id) {
      try {
        await analyticsApi.processTestResult(response.result.id);
      } catch {
        /* non-fatal */
      }
    }
  } catch (err) {
    console.error('Failed to submit play result:', err);
    toast.error('Run not saved', {
      id: 'play-result-submit-failed',
      description:
        'We could not reach the server. Your local best is kept, but this run is missing from your history.',
    });
  }
}
