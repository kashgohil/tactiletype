import { Link, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { APP_COPY } from '@/content/app-copy';
import { CreateRoomModal } from '../components/multiplayer/CreateRoomModal';
import { RoomBrowser } from '../components/multiplayer/RoomBrowser';
import { useAuth } from '../contexts';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { multiplayerApi } from '../services/multiplayerApi';

/** Authored once in `content/app-copy.ts`; the prerenderer mirrors the same strings. */
const COPY = APP_COPY['/multiplayer'];

/** H1 and intro, shown in both the signed-out and signed-in states. */
const MultiplayerHeader: React.FC = () => (
  <header className="space-y-2.5 max-w-2xl">
    <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">{COPY.h1}</h1>
    <p className="text-text/50 leading-relaxed text-[15px]">{COPY.intro}</p>
  </header>
);

export const Multiplayer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [multiplayerState, multiplayerActions] = useMultiplayer(user?.id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !multiplayerState.isConnected && !connecting) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        setConnecting(true);
        multiplayerActions
          .connect(token)
          .catch((e) => setActionError(e instanceof Error ? e.message : 'Connect failed'))
          .finally(() => setConnecting(false));
      }
    }
  }, [user, multiplayerState.isConnected, connecting, multiplayerActions]);

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    setActionError(null);
    try {
      await multiplayerApi.joinRoom(roomId);
      multiplayerActions.joinRoom(roomId, user.id, user.username);
      navigate({ to: '/multiplayer/room/$roomId', params: { roomId } });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to join room');
    }
  };

  const handleSpectateRoom = async (roomId: string) => {
    if (!user) return;
    setActionError(null);
    try {
      await multiplayerApi.joinRoom(roomId, { spectate: true });
      multiplayerActions.joinRoom(roomId, user.id, user.username, true);
      navigate({
        to: '/multiplayer/room/$roomId',
        params: { roomId },
        search: { spectate: '1' } as never,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to spectate');
    }
  };

  const handleRoomCreated = async (roomId: string) => {
    if (!user) return;
    setActionError(null);
    try {
      // Host already DB-joined on create; still ensure WS join
      multiplayerActions.joinRoom(roomId, user.id, user.username);
      navigate({ to: '/multiplayer/room/$roomId', params: { roomId } });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to open room');
    }
  };

  if (!user) {
    // Signed out is the state a crawler always sees, so this branch carries
    // the page's H1 and its explanation of what multiplayer is. It used to be
    // a bare "Authentication Required" card, which left an indexable URL with
    // nothing on it to index.
    return (
      <div className="space-y-10">
        <MultiplayerHeader />

        <section className="max-w-3xl space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">{COPY.steps?.heading}</h2>
          <ol className="space-y-3">
            {(COPY.steps?.items ?? []).map((step, i) => (
              <li key={step} className="flex gap-3.5">
                <span className="mt-0.5 size-6 shrink-0 rounded-full bg-accent/[0.12] text-accent text-xs font-semibold flex items-center justify-center tabular-nums">
                  {i + 1}
                </span>
                <span className="text-text/70 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-3xl">
          <div>
            <h2 className="font-semibold tracking-tight">Racing needs an account</h2>
            <p className="text-sm text-text/45 mt-1 max-w-md leading-relaxed">
              Rooms are tied to a username so results and progress survive the race. Creating one is
              free.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild>
              <Link to="/register">Create account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </section>

        <p className="text-sm text-text/45 max-w-3xl leading-relaxed">
          Would rather not sign up?{' '}
          <Link
            to="/play/$mode"
            params={{ mode: 'ghost-race' }}
            className="text-accent underline-offset-2 hover:underline"
          >
            Ghost Race
          </Link>{' '}
          runs the same pacing pressure against a caret that types at a fixed WPM, and{' '}
          <Link to="/" className="text-accent underline-offset-2 hover:underline">
            the typing test
          </Link>{' '}
          needs no account at all.
        </p>
      </div>
    );
  }

  const status = multiplayerState.connectionStatus;
  const statusColor =
    status === 'connected'
      ? 'bg-accent'
      : status === 'connecting' || connecting
        ? 'bg-text/30 animate-pulse'
        : 'bg-destructive';

  return (
    <div>
      <div>
        <div className="mb-8">
          <MultiplayerHeader />
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="text-sm text-text/50">
              {status === 'connected'
                ? 'Connected to server'
                : status === 'connecting' || connecting
                  ? 'Connecting to server...'
                  : 'Disconnected from server'}
            </span>
            {status === 'disconnected' && (
              <Button
                size="sm"
                className="ml-2"
                disabled={connecting}
                onClick={() => {
                  const token = localStorage.getItem('auth_token');
                  if (!token) return;
                  setConnecting(true);
                  multiplayerActions.connect(token).finally(() => setConnecting(false));
                }}
              >
                {connecting ? 'Connecting...' : 'Reconnect'}
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {(multiplayerState.error || actionError) && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-destructive">{actionError || multiplayerState.error}</p>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  multiplayerActions.clearError();
                }}
                className="text-destructive hover:opacity-70"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {multiplayerState.isConnected ? (
          <RoomBrowser
            onJoinRoom={handleJoinRoom}
            onSpectateRoom={handleSpectateRoom}
            onCreateRoom={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">
              {connecting ? 'Connecting to server...' : 'Connection required'}
            </h3>
            <p className="text-text/50">
              {connecting
                ? 'Please wait while we establish a connection.'
                : 'Please connect to the server to view available rooms.'}
            </p>
          </div>
        )}

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={handleRoomCreated}
        />
      </div>
    </div>
  );
};
