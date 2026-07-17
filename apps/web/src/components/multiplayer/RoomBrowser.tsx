import { Button } from '@/components/ui/button';
import type { MultiplayerRoomWithDetails } from '@tactile/types';
import { RefreshCw, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { multiplayerApi } from '../../services/multiplayerApi';

interface RoomBrowserProps {
  onJoinRoom: (roomId: string) => void;
  onSpectateRoom?: (roomId: string) => void;
  onCreateRoom: () => void;
}

export const RoomBrowser: React.FC<RoomBrowserProps> = ({
  onJoinRoom,
  onSpectateRoom,
  onCreateRoom,
}) => {
  const [rooms, setRooms] = useState<MultiplayerRoomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // waiting + active so users can join or spectate
      const response = await multiplayerApi.getRooms(1, 30, 'live');
      setRooms(response.rooms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    const id = setInterval(loadRooms, 8000);
    return () => clearInterval(id);
  }, [loadRooms]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Open rooms</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRooms}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={onCreateRoom}>
            Create room
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading && rooms.length === 0 ? (
        <div className="text-center py-12 text-text/40">Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <div className="bg-accent/10 rounded-xl p-10 text-center space-y-3">
          <Users className="size-10 text-accent mx-auto opacity-70" />
          <p className="font-medium">No open rooms</p>
          <p className="text-sm text-text/50">
            Create one and share the link with friends.
          </p>
          <Button onClick={onCreateRoom}>Create room</Button>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="bg-accent/10 hover:bg-accent/15 rounded-xl p-4 border border-transparent hover:border-accent/20 transition-colors flex flex-col gap-3"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{room.name}</h3>
                  <p className="text-xs text-text/50 mt-0.5">
                    Host @{room.host?.username ?? '—'}
                  </p>
                </div>
                <span className="text-xs font-mono bg-accent/20 px-2 py-1 rounded-md shrink-0 h-fit">
                  {room.currentPlayers ?? 0}/{room.maxPlayers}
                </span>
              </div>
              <p className="text-sm text-text/60 line-clamp-1">
                {room.testText?.title ?? 'Typing race'} ·{' '}
                <span className="capitalize">
                  {room.testText?.difficulty ?? 'medium'}
                </span>
              </p>
              <div className="flex gap-2 self-start">
                {room.status === 'waiting' || !room.status ? (
                  <Button size="sm" onClick={() => onJoinRoom(room.id)}>
                    Join
                  </Button>
                ) : null}
                {(room.status === 'active' || room.status === 'waiting') &&
                  onSpectateRoom && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSpectateRoom(room.id)}
                    >
                      Spectate
                    </Button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
