import type { MultiplayerRoomWithDetails } from '@tactile/types';
import { Loader2, Plus, RefreshCw, Users } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { multiplayerApi } from '../../services/multiplayerApi';

interface RoomBrowserProps {
  onJoinRoom: (roomId: string) => void;
  onSpectateRoom?: (roomId: string) => void;
  onCreateRoom: () => void;
}

const DIFFICULTY_TONE: Record<string, string> = {
  easy: 'text-text/50',
  medium: 'text-text/70',
  hard: 'text-accent',
};

export const RoomBrowser: React.FC<RoomBrowserProps> = ({
  onJoinRoom,
  onSpectateRoom,
  onCreateRoom,
}) => {
  const [rooms, setRooms] = useState<MultiplayerRoomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadRooms = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await multiplayerApi.getRooms(pageNum, 10);

      if (pageNum === 1) {
        setRooms(response.rooms);
      } else {
        setRooms((prev) => [...prev, ...response.rooms]);
      }

      setHasMore(response.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-text/60">
        <Loader2 className="size-4 animate-spin" />
        Loading rooms...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Races</h1>
          <p className="text-text/60">Join a room, or start one and share the link.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => loadRooms(1)} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
            Refresh
          </Button>
          <Button onClick={onCreateRoom}>
            <Plus />
            New room
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded-lg px-4 py-3"
        >
          {error}
        </p>
      )}

      {rooms.length === 0 && !loading ? (
        <div className="rounded-2xl border border-accent/15 bg-accent/[0.05] py-16 text-center space-y-3">
          <Users className="mx-auto size-8 text-text/30" />
          <div className="space-y-1">
            <h2 className="font-medium">No rooms yet</h2>
            <p className="text-sm text-text/60">
              Be the first — a room stays open until everyone leaves.
            </p>
          </div>
          <Button onClick={onCreateRoom}>
            <Plus />
            New room
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const isFull = room.currentPlayers >= room.maxPlayers;

            return (
              <div
                key={room.id}
                className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-5 space-y-4 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium truncate">{room.name}</h2>
                    <p className="text-sm text-text/50 truncate">Host: {room.host.username}</p>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      DIFFICULTY_TONE[room.testText.difficulty] ?? 'text-text/50'
                    }`}
                  >
                    {room.testText.difficulty}
                  </span>
                </div>

                <div className="text-sm">
                  <p className="truncate">{room.testText.title}</p>
                  <p className="text-xs text-text/50">{room.testText.wordCount} words</p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="flex items-center gap-1.5 text-sm text-text/60">
                    <Users className="size-4" />
                    {room.currentPlayers}/{room.maxPlayers}
                  </span>
                  <div className="flex items-center gap-1">
                    {onSpectateRoom && (
                      <Button variant="ghost" size="sm" onClick={() => onSpectateRoom(room.id)}>
                        Spectate
                      </Button>
                    )}
                    <Button size="sm" disabled={isFull} onClick={() => onJoinRoom(room.id)}>
                      {isFull ? 'Full' : 'Join'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => !loading && loadRooms(page + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
};
