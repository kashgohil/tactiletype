import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Crown, LogOut, Play, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { multiplayerApi } from '../services/multiplayerApi';
import {
  TypingEngine,
  isNonPrintingKey,
  type TypingStats,
} from '../utils/typingEngine';

export const MultiplayerRoom: React.FC = () => {
  const { roomId } = useParams({ strict: false }) as { roomId: string };
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, actions] = useMultiplayer(user?.id);
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<TypingEngine | null>(null);
  const [stats, setStats] = useState<TypingStats | null>(null);
  const [localIndex, setLocalIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const inputRef = useRef<HTMLDivElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const text = state.currentRoom?.testText?.content ?? '';
  const isRacing = state.raceStatus === 'active';
  const isCountdown = state.raceStatus === 'countdown';
  const isFinished = state.raceStatus === 'finished';
  const isWaiting = state.raceStatus === 'waiting';

  // Connect + join room
  useEffect(() => {
    if (!user || !roomId) return;
    let cancelled = false;

    (async () => {
      try {
        setJoining(true);
        setError(null);
        const token = localStorage.getItem('auth_token');
        if (!token) throw new Error('Not authenticated');

        if (!state.isConnected) {
          await actions.connect(token);
        }
        await multiplayerApi.joinRoom(roomId);
        if (!cancelled) {
          actions.joinRoom(roomId, user.id, user.username);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to join');
        }
      } finally {
        if (!cancelled) setJoining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per room
  }, [user?.id, roomId]);

  // Build typing engine when race starts
  useEffect(() => {
    if (isRacing && text && !engine) {
      const e = new TypingEngine(
        text,
        (s) => setStats(s),
        (st) => setLocalIndex(st.currentIndex)
      );
      setEngine(e);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (isWaiting || isCountdown) {
      setEngine(null);
      setStats(null);
      setLocalIndex(0);
    }
  }, [isRacing, text, engine, isWaiting, isCountdown]);

  // Broadcast progress ~4/s while racing
  useEffect(() => {
    if (!isRacing || !engine) return;
    progressTimer.current = setInterval(() => {
      const s = engine.calculateStats();
      const st = engine.getState();
      const progress =
        text.length > 0
          ? Math.min(100, (st.currentIndex / text.length) * 100)
          : 0;
      actions.sendTypingProgress(
        progress,
        s.wpm,
        s.accuracy,
        s.incorrectChars
      );
      if (st.isComplete) {
        actions.sendTypingProgress(100, s.wpm, s.accuracy, s.incorrectChars);
      }
    }, 250);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [isRacing, engine, text.length, actions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!engine || !isRacing) return;
      e.preventDefault();
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace') return;
      engine.handleKeyPress(e.key);
    },
    [engine, isRacing]
  );

  const leave = async () => {
    try {
      actions.leaveRoom();
      if (roomId) await multiplayerApi.leaveRoom(roomId);
    } catch {
      // ignore
    }
    navigate({ to: '/multiplayer' });
  };

  const participants = state.currentRoom?.participants ?? [];
  const ranked = useMemo(
    () =>
      [...participants].sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return b.wpm - a.wpm;
      }),
    [participants]
  );

  const renderText = () => {
    if (!text) return null;
    return (
      <div className="flex flex-wrap font-mono text-xl leading-relaxed tracking-wide">
        {text.split('').map((ch, i) => {
          let cls = 'text-text/35';
          if (engine) {
            const status = engine.getCharacterStatus(i);
            if (status === 'correct') cls = 'text-text border-b border-accent/60';
            else if (status === 'incorrect')
              cls = 'text-rose-500 bg-rose-500/15';
            else if (status === 'current') cls = 'text-text/50 bg-accent/20';
          }
          return (
            <span key={i} className={cn('relative', cls)}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          );
        })}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="text-center py-16 text-text/50">Please log in.</div>
    );
  }

  return (
    <div className="pt-2 pb-10 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {state.currentRoom?.name ?? 'Race room'}
          </h1>
          <p className="text-xs text-text/50 font-mono">{roomId}</p>
        </div>
        <div className="flex gap-2">
          {state.isHost && isWaiting && (
            <Button onClick={() => actions.startRace()}>
              <Play className="size-4" />
              Start race
            </Button>
          )}
          <Button variant="outline" onClick={leave}>
            <LogOut className="size-4" />
            Leave
          </Button>
        </div>
      </div>

      {(error || state.error || joining) && (
        <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-text/60">
          {joining
            ? 'Joining room…'
            : error || state.error}
        </div>
      )}

      {/* Countdown overlay */}
      {isCountdown && state.countdown != null && (
        <div className="bg-accent/20 border border-accent/40 rounded-2xl py-16 text-center">
          <p className="text-sm text-text/50 mb-2">Get ready</p>
          <p className="text-7xl font-bold font-mono text-accent">
            {state.countdown > 0 ? state.countdown : 'GO'}
          </p>
        </div>
      )}

      {/* Race typing area */}
      {isRacing && (
        <div
          ref={inputRef}
          tabIndex={0}
          role="textbox"
          aria-label="Race typing area"
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            'bg-accent/15 rounded-xl p-6 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 min-h-[140px]',
            !focused && 'opacity-80'
          )}
        >
          {!focused && (
            <p className="text-center text-text/40 text-sm mb-3">
              Click here and type
            </p>
          )}
          {renderText()}
          {stats && (
            <div className="flex gap-4 mt-4 text-sm font-mono text-text/60">
              <span>
                <span className="text-accent font-semibold">{stats.wpm}</span>{' '}
                wpm
              </span>
              <span>
                <span className="text-accent font-semibold">
                  {stats.accuracy}%
                </span>
              </span>
              <span>
                {localIndex}/{text.length}
              </span>
            </div>
          )}
        </div>
      )}

      {isWaiting && (
        <div className="bg-accent/10 rounded-xl p-8 text-center space-y-2">
          <p className="font-medium">Waiting for host to start</p>
          <p className="text-sm text-text/50">
            {state.isHost
              ? 'You are the host — press Start when ready (solo is OK).'
              : 'Hang tight for the countdown.'}
          </p>
          {state.currentRoom?.testText && (
            <p className="text-xs text-text/40 pt-2">
              Text: {state.currentRoom.testText.title} (
              {state.currentRoom.testText.wordCount} words)
            </p>
          )}
        </div>
      )}

      {isFinished && (
        <div className="bg-accent/15 border border-accent/30 rounded-xl p-6 text-center space-y-2">
          <Trophy className="size-8 text-accent mx-auto" />
          <h2 className="text-lg font-semibold">Race complete</h2>
          <p className="text-sm text-text/50">Final standings below.</p>
        </div>
      )}

      {/* Live standings */}
      <section className="bg-accent/10 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-text/70 px-1">Racers</h2>
        <ul className="space-y-2">
          {ranked.map((p, i) => (
            <li
              key={p.userId}
              className={cn(
                'rounded-lg px-3 py-2 bg-primary/40',
                p.userId === user.id && 'ring-1 ring-accent/50'
              )}
            >
              <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="text-text/40 font-mono w-5">{i + 1}</span>
                  {p.username}
                  {p.userId === state.currentRoom?.hostId && (
                    <Crown className="size-3.5 text-accent" />
                  )}
                  {p.finished && (
                    <span className="text-[10px] uppercase text-accent">
                      done
                    </span>
                  )}
                </span>
                <span className="font-mono text-accent text-xs">
                  {Math.round(p.wpm)} wpm · {Math.round(p.accuracy)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-accent/15 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${Math.min(100, p.progress)}%` }}
                />
              </div>
            </li>
          ))}
          {ranked.length === 0 && (
            <li className="text-sm text-text/40 px-1 py-4 text-center">
              No participants yet
            </li>
          )}
        </ul>
      </section>
    </div>
  );
};
