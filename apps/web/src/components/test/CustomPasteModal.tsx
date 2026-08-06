import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  addPlaylistItem,
  listPlaylists,
  removePlaylistItem,
  type PlaylistItem,
} from '@/utils/playlists';
import { ClipboardPaste, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface CustomPasteModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (content: string, title: string) => void;
}

export const CustomPasteModal: React.FC<CustomPasteModalProps> = ({
  open,
  onClose,
  onStart,
}) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [saveToPlaylist, setSaveToPlaylist] = useState(true);
  const [tick, setTick] = useState(0);

  const playlist = useMemo(() => listPlaylists()[0], [tick, open]);

  if (!open) return null;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const start = (content: string, itemTitle: string, persist: boolean) => {
    const cleaned = content.trim();
    if (cleaned.length < 3) return;
    if (persist) {
      addPlaylistItem(cleaned, itemTitle || undefined);
      setTick((t) => t + 1);
    }
    onStart(cleaned, itemTitle || 'Custom paste');
    setText('');
    setTitle('');
    onClose();
  };

  const remove = (item: PlaylistItem) => {
    removePlaylistItem(item.id);
    setTick((t) => t + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in-0 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-paste-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-primary border border-accent/30 rounded-2xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] origin-center">
        <div className="flex items-center justify-between px-4 py-3 border-b border-accent/20">
          <h2
            id="custom-paste-title"
            className="font-semibold flex items-center gap-2"
          >
            <ClipboardPaste className="size-4 text-accent" />
            Custom text
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-text/50">
            Paste an email, essay, or code snippet. Practice with your own
            material.
          </p>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
            maxLength={80}
          />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text here…"
            rows={6}
            className="font-mono resize-y min-h-30"
            autoFocus
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text/40">
            <Label
              htmlFor="paste-save"
              className="text-xs text-text/40 font-normal cursor-pointer"
            >
              <Checkbox
                id="paste-save"
                checked={saveToPlaylist}
                onCheckedChange={(v) => setSaveToPlaylist(v === true)}
              />
              Save to my playlist
            </Label>
            <span>{wordCount} words</span>
          </div>
          <Button
            className="w-full"
            disabled={wordCount < 1}
            onClick={() => start(text, title, saveToPlaylist)}
          >
            Start typing
          </Button>
        </div>

        {playlist && playlist.items.length > 0 && (
          <div className="px-4 pb-4 border-t border-accent/15 pt-3">
            <h3 className="text-sm font-medium mb-2">{playlist.name}</h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {playlist.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 text-sm bg-accent/10 rounded-lg px-3 py-2"
                >
                  <button
                    type="button"
                    className="flex-1 text-left truncate hover:text-accent cursor-pointer"
                    onClick={() => start(item.content, item.title, false)}
                  >
                    {item.title}
                    <span className="text-text/40 text-xs ml-2">
                      {item.content.trim().split(/\s+/).length}w
                    </span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={() => remove(item)}
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
