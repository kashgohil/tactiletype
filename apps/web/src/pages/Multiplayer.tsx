import { Button } from '@/components/ui/button';
import { Link, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { CreateRoomModal } from '../components/multiplayer/CreateRoomModal';
import { RoomBrowser } from '../components/multiplayer/RoomBrowser';
import { useAuth } from '../contexts';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { multiplayerApi } from '../services/multiplayerApi';

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
          .catch((e) =>
            setActionError(e instanceof Error ? e.message : 'Connect failed')
          )
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
      setActionError(
        error instanceof Error ? error.message : 'Failed to join room'
      );
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
      setActionError(
        error instanceof Error ? error.message : 'Failed to spectate'
      );
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
      setActionError(
        error instanceof Error ? error.message : 'Failed to open room'
      );
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-2xl font-bold">Log in for multiplayer</h2>
        <p className="text-text/50">
          Race friends in real time with live WPM and progress.
        </p>
        <Button asChild>
          <Link to="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  const status = multiplayerState.connectionStatus;
  const statusColor =
    status === 'connected'
      ? 'bg-emerald-500'
      : status === 'connecting' || connecting
        ? 'bg-amber-400'
        : 'bg-rose-500';

  return (
    <div className="pt-2 pb-10 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Multiplayer</h1>
          <p className="text-text/50 text-sm mt-1">
            Create or join a room — race starts with a short countdown.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text/60">
          <span className={`size-2.5 rounded-full ${statusColor}`} />
          {status === 'connected'
            ? 'Connected'
            : status === 'connecting' || connecting
              ? 'Connecting…'
              : 'Disconnected'}
          {status === 'disconnected' && (
            <Button
              size="sm"
              variant="outline"
              disabled={connecting}
              onClick={() => {
                const token = localStorage.getItem('auth_token');
                if (!token) return;
                setConnecting(true);
                multiplayerActions
                  .connect(token)
                  .finally(() => setConnecting(false));
              }}
            >
              Reconnect
            </Button>
          )}
        </div>
      </header>

      {(multiplayerState.error || actionError) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex justify-between gap-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            {actionError || multiplayerState.error}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setActionError(null);
              multiplayerActions.clearError();
            }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {multiplayerState.isConnected ? (
        <RoomBrowser
          onJoinRoom={handleJoinRoom}
          onSpectateRoom={handleSpectateRoom}
          onCreateRoom={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="bg-accent/10 rounded-xl p-12 text-center text-text/50">
          {connecting
            ? 'Connecting to race server…'
            : 'Connect to browse and create rooms.'}
        </div>
      )}

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
};
