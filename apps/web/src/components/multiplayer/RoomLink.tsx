import { Check, Copy } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * The shareable URL for a race room.
 *
 * Built from `window.location.origin` rather than `SITE_URL` so a link copied
 * from a preview deployment or from localhost points back at the host the
 * copier is actually on. Falls back to a relative path during SSR/prerender,
 * where there is no origin to read.
 */
export function roomUrl(roomId: string): string {
  const path = `/multiplayer/room/${roomId}`;
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

/**
 * Copy-to-clipboard with a two-second confirmation.
 *
 * The clipboard API is unavailable outside secure contexts and can be refused
 * by permission, so the failure path says so instead of leaving a button that
 * silently does nothing.
 */
function useCopyRoomLink(roomId: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl(roomId));
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link', {
        description: 'Your browser blocked clipboard access. Select the link and copy it by hand.',
      });
    }
  };

  return { copied, copy };
}

/** Compact copy button, for a toolbar that already has other actions in it. */
export const CopyRoomLinkButton: React.FC<{
  roomId: string;
  variant?: 'default' | 'outline' | 'ghost';
}> = ({ roomId, variant = 'outline' }) => {
  const { copied, copy } = useCopyRoomLink(roomId);

  return (
    <Button variant={variant} onClick={copy} aria-label="Copy the link to this room">
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
};

/**
 * The link itself, readable and selectable, with the copy button beside it.
 *
 * The input is deliberately present rather than being plain text: when the
 * clipboard is unavailable, there has to be something the visitor can select.
 */
export const RoomLinkField: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { copied, copy } = useCopyRoomLink(roomId);
  const url = roomUrl(roomId);

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={url}
        aria-label="Room link"
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-xs"
      />
      <Button type="button" onClick={copy} className="shrink-0">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
};
