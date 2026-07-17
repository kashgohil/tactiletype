import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import React, { useState } from 'react';
import { multiplayerApi } from '../../services/multiplayerApi';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await multiplayerApi.createRoom({
        name: name.trim(),
        maxPlayers,
      });
      onRoomCreated(response.room.id);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in-0 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-room-title"
    >
      <div className="bg-primary border border-accent/30 rounded-2xl max-w-md w-full shadow-xl animate-in fade-in-0 zoom-in-95 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] origin-center">
        <div className="flex items-center justify-between px-4 py-3 border-b border-accent/20">
          <h2 id="create-room-title" className="font-semibold">
            Create room
          </h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="text-xs text-text/50 block mb-1.5">Room name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday night races"
              maxLength={100}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-text/50 block mb-1.5">
              Max players ({maxPlayers})
            </label>
            <input
              type="range"
              min={2}
              max={10}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
          <p className="text-xs text-text/40">
            Race text is picked randomly from the content library.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
