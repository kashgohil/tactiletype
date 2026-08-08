import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Crown, Eye, LogOut, Play, Trophy } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RaceChat } from '@/components/multiplayer/RaceChat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { multiplayerApi } from '../services/multiplayerApi';
import { isNonPrintingKey, TypingEngine, type TypingStats } from '../utils/typingEngine';

export const MultiplayerRoom: React.FC = () => {
  const { roomId } = useParams({ strict: false }) as { roomId: string };
  const search = useSearch({ strict: false }) as { spectate?: string };
  const wantSpectate = search.spectate === '1';
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
  const isSpectator = state.role === 'spectator';
  const isRacing = state.raceStatus === 'active' && !isSpectator;
  const isCountdown = state.raceStatus === 'countdown';
  const isFinished = state.raceStatus === 'finished';
  const isWaiting = state.raceStatus === 'waiting';
  const watching =
    isSpectator &&
    (state.raceStatus === 'active' ||
      state.raceStatus === 'countdown' ||
      state.raceStatus === 'finished');

  // Keyed on `user?.id`, not `user`: a new object identity for the same person
  // must not tear down and rejoin the room. `actions.connect` is likewise held
  // out on purpose - it is recreated per render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate join-once-per-room effect
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

        // Try racer join first unless ?spectate=1
        let spectate = wantSpectate;
        try {
          await multiplayerApi.joinRoom(roomId, { spectate });
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (!spectate && msg.toLowerCase().includes('spectator')) {
            spectate = true;
            await multiplayerApi.joinRoom(roomId, { spectate: true });
          } else {
            throw e;
          }
        }

        if (!cancelled) {
          actions.joinRoom(roomId, user.id, user.username, spectate);
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
  }, [user?.id, roomId, wantSpectate]);

  useEffect(() => {
    if (isRacing && text && !engine) {
      const e = new TypingEngine(
        text,
        (s) => setStats(s),
        (st) => setLocalIndex(st.currentIndex)
      );
      setEngine(e);
      // `preventScroll`: the typing surface sits below the fold on a tall
      // room, and a plain focus() scrolls it into view, dragging the footer up
      // with it the moment the race starts.
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    }
    if (isWaiting || isCountdown || isSpectator) {
      setEngine(null);
      setStats(null);
      setLocalIndex(0);
    }
  }, [isRacing, text, engine, isWaiting, isCountdown, isSpectator]);

  useEffect(() => {
    if (!isRacing || !engine) return;
    progressTimer.current = setInterval(() => {
      const s = engine.calculateStats();
      const st = engine.getState();
      const progress = text.length > 0 ? Math.min(100, (st.currentIndex / text.length) * 100) : 0;
      actions.sendTypingProgress(progress, s.wpm, s.accuracy, s.incorrectChars);
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
      if (roomId && !isSpectator) await multiplayerApi.leaveRoom(roomId);
    } catch {
      // ignore
    }
    navigate({ to: '/multiplayer' });
  };

  const participants = state.currentRoom?.participants ?? [];
  const spectators = state.currentRoom?.spectators ?? [];
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
            if (status === 'correct') cls = 'text-text';
            else if (status === 'incorrect') cls = 'text-destructive';
            else if (status === 'current') cls = 'text-text/50 bg-accent/35 rounded-sm';
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
    return <div className="text-center py-16 text-text/50">Please log in.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {state.currentRoom?.name ?? 'Race room'}
            {isSpectator && (
              <span className="text-xs font-normal bg-accent/20 text-accent px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Eye className="size-3" /> Spectating
              </span>
            )}
          </h1>
          <p className="text-xs text-text/50 font-mono">{roomId}</p>
        </div>
        <div className="flex gap-2">
          {state.isHost && isWaiting && !isSpectator && (
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
        <div className="rounded-lg bg-accent/[0.06] px-4 py-3 text-sm text-text/60">
          {joining ? 'Joining room…' : error || state.error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {isCountdown && state.countdown != null && (
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.12] py-16 text-center">
              <p className="text-sm text-text/50 mb-2">
                {isSpectator ? 'Race starting' : 'Get ready'}
              </p>
              <p className="text-7xl font-bold font-mono text-accent">
                {state.countdown > 0 ? state.countdown : 'GO'}
              </p>
            </div>
          )}

          {isRacing && (
            // biome-ignore lint/a11y/useSemanticElements: a real textarea cannot render the per-character correct/incorrect colouring this surface exists to show
            <div
              ref={inputRef}
              tabIndex={0}
              role="textbox"
              aria-label="Race typing area"
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                'bg-accent/30 rounded-lg p-6 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 min-h-[140px]',
                !focused && 'opacity-80'
              )}
            >
              {!focused && (
                <p className="text-center text-text/40 text-sm mb-3">Click here and type</p>
              )}
              {renderText()}
              {stats && (
                <div className="flex gap-4 mt-4 text-sm font-mono text-text/60">
                  <span>
                    <span className="text-accent font-semibold">{stats.wpm}</span> wpm
                  </span>
                  <span>
                    <span className="text-accent font-semibold">{stats.accuracy}%</span>
                  </span>
                  <span>
                    {localIndex}/{text.length}
                  </span>
                </div>
              )}
            </div>
          )}

          {watching && state.raceStatus === 'active' && (
            <div className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-8 text-center space-y-2">
              <Eye className="size-8 text-accent mx-auto" />
              <p className="font-medium">Watching live</p>
              <p className="text-sm text-text/50">
                Progress updates in the standings. Chat freely.
              </p>
            </div>
          )}

          {isWaiting && (
            <div className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-8 text-center space-y-2">
              <p className="font-medium">
                {isSpectator ? 'Spectating lobby' : 'Waiting for host to start'}
              </p>
              <p className="text-sm text-text/50">
                {state.isHost && !isSpectator
                  ? 'You are the host - press Start when ready (solo is OK).'
                  : isSpectator
                    ? 'You will see the race when it begins.'
                    : 'Hang tight for the countdown.'}
              </p>
              {state.currentRoom?.testText && (
                <p className="text-xs text-text/40 pt-2">
                  Text: {state.currentRoom.testText.title} ({state.currentRoom.testText.wordCount}{' '}
                  words)
                </p>
              )}
            </div>
          )}

          {isFinished && (
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.12] p-6 text-center space-y-2">
              <Trophy className="size-8 text-accent mx-auto" />
              <h2 className="text-lg font-semibold">Race complete</h2>
              <p className="text-sm text-text/50">Results saved to the room standings.</p>
            </div>
          )}

          <section className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-4 space-y-2">
            <h2 className="text-sm font-semibold text-text/70 px-1">Racers</h2>
            <ul className="space-y-2">
              {ranked.map((p, i) => (
                <li
                  key={p.userId}
                  className={cn(
                    'rounded-lg px-3 py-2 bg-primary/40',
                    p.userId === user.id && !isSpectator && 'ring-1 ring-accent/50'
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
                        <span className="text-[10px] uppercase text-accent">done</span>
                      )}
                    </span>
                    <span className="font-mono text-accent text-xs">
                      {Math.round(p.wpm)} wpm · {Math.round(p.accuracy)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-accent/20 overflow-hidden">
                    <div
                      className="h-full w-full bg-accent origin-left transition-transform duration-200 ease-linear"
                      style={{
                        transform: `translateX(-${100 - Math.min(100, p.progress)}%)`,
                      }}
                    />
                  </div>
                </li>
              ))}
              {ranked.length === 0 && (
                <li className="text-sm text-text/40 px-1 py-4 text-center">No racers yet</li>
              )}
            </ul>
            {spectators.length > 0 && (
              <div className="pt-2 border-t border-accent/15">
                <p className="text-xs text-text/40 px-1 mb-1.5 flex items-center gap-1">
                  <Eye className="size-3" />
                  Spectators ({spectators.length})
                </p>
                <p className="text-xs text-text/60 px-1">
                  {spectators.map((s) => s.username).join(', ')}
                </p>
              </div>
            )}
          </section>
        </div>

        <RaceChat messages={state.chat} onSend={actions.sendChat} disabled={!state.isInRoom} />
      </div>
    </div>
  );
};
