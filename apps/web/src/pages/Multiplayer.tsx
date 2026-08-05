import { Button } from '@/components/ui/button';
import { Link, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-text/50 mb-6">
            Please log in to access multiplayer features.
          </p>
          <Button asChild>
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  multiplayerActions
                    .connect(token)
                    .finally(() => setConnecting(false));
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
              <p className="text-sm text-destructive">
                {actionError || multiplayerState.error}
              </p>
              <button
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
