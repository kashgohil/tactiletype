import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TestText } from '@tactile/types';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { multiplayerApi } from '../../services/multiplayerApi';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

const MAX_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    testTextId: '',
    maxPlayers: 10,
  });
  const [testTexts, setTestTexts] = useState<TestText[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load test texts when modal opens
  useEffect(() => {
    if (!isOpen || testTexts.length > 0) return;

    const loadTestTexts = async () => {
      try {
        setLoadingTexts(true);
        const texts = await multiplayerApi.getTestTexts();
        setTestTexts(texts);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load test texts'
        );
      } finally {
        setLoadingTexts(false);
      }
    };

    loadTestTexts();
  }, [isOpen, testTexts.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Room name is required');
      return;
    }

    if (!formData.testTextId) {
      setError('Please select a test text');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await multiplayerApi.createRoom({
        name: formData.name.trim(),
        testTextId: formData.testTextId,
        maxPlayers: formData.maxPlayers,
      });

      onRoomCreated(response.room.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', testTextId: '', maxPlayers: 10 });
    setError(null);
    onClose();
  };

  const selectedText = testTexts.find((t) => t.id === formData.testTextId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent data-theme-surface className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Create a room</DialogTitle>
            <DialogDescription>
              Pick a text and invite others to race it with you.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p
              role="alert"
              className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="roomName" className="text-sm font-medium text-muted">
              Room name
            </label>
            <Input
              id="roomName"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Friday night sprints"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="testText" className="text-sm font-medium text-muted">
              Text
            </label>
            {loadingTexts ? (
              <div className="flex items-center gap-2 text-sm text-muted py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading texts...
              </div>
            ) : (
              <Select
                value={formData.testTextId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, testTextId: value }))
                }
              >
                <SelectTrigger id="testText" className="w-full">
                  <SelectValue placeholder="Choose a text..." />
                </SelectTrigger>
                <SelectContent>
                  {testTexts.map((text) => (
                    <SelectItem key={text.id} value={text.id}>
                      {text.title}
                      <span className="text-muted">
                        {text.wordCount} words · {text.difficulty}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedText && (
              <p className="text-sm text-muted line-clamp-3 border-l-2 border-line pl-3 mt-2">
                {selectedText.content}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="maxPlayers"
              className="text-sm font-medium text-muted"
            >
              Maximum players
            </label>
            <Select
              value={String(formData.maxPlayers)}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, maxPlayers: Number(value) }))
              }
            >
              <SelectTrigger id="maxPlayers" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_PLAYER_OPTIONS.map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} players
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingTexts}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
