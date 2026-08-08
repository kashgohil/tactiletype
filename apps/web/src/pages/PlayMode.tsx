import { Link, useParams } from '@tanstack/react-router';
import type React from 'react';
import { GhostRaceMode } from '@/components/play/GhostRaceMode';
import { LessonPathMode } from '@/components/play/LessonPathMode';
import { MemoryFlashMode } from '@/components/play/MemoryFlashMode';
import { SuddenDeathMode } from '@/components/play/SuddenDeathMode';
import { WeakStormMode } from '@/components/play/WeakStormMode';
import { WordStormMode } from '@/components/play/WordStormMode';
import { Button } from '@/components/ui/button';
import { getPlayMode, type PlayModeId } from '@/utils/playModes';

const MODES: Record<PlayModeId, React.FC> = {
  'sudden-death': SuddenDeathMode,
  'word-storm': WordStormMode,
  'memory-flash': MemoryFlashMode,
  'ghost-race': GhostRaceMode,
  'lesson-path': LessonPathMode,
  'weak-storm': WeakStormMode,
};

export const PlayMode: React.FC = () => {
  const { mode } = useParams({ from: '/play/$mode' });
  const meta = getPlayMode(mode);
  const Component = meta ? MODES[meta.id] : null;

  if (!Component || !meta) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <h1 className="text-xl font-semibold">Unknown mode</h1>
        <p className="text-sm text-text/50">That play mode doesn&apos;t exist.</p>
        <Button asChild>
          <Link to="/play">Back to play modes</Link>
        </Button>
      </div>
    );
  }

  return <Component />;
};
