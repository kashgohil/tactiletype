import { Button } from '@/components/ui/button';
import type { TypingStats } from '@/utils/typingEngine';
import { formatTime } from '@/utils/typingEngine';

interface ResultsSummaryProps {
  stats: TypingStats;
  onRestart: () => void;
}

export function ResultsSummary({ stats, onRestart }: ResultsSummaryProps) {
  return (
    <>
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
            <div className="text-xl font-semibold">{stats.correctChars}</div>
            <div className="text-sm">Correct characters</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{formatTime(stats.timeElapsed)}</div>
            <div className="text-sm">Time taken</div>
          </div>
        </div>
      </div>

      <Button onClick={onRestart}>Reset</Button>
    </>
  );
}
