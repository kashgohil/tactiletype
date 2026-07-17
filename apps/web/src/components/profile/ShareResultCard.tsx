import { Button } from '@/components/ui/button';
import {
  downloadShareCard,
  shareCardImage,
} from '@/utils/exportShareCard';
import { Copy, Download, ImageIcon, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ShareResultCardProps {
  username: string;
  displayName: string;
  bestWpm: number;
  avgAccuracy: number;
  totalTests: number;
  resultWpm?: number;
  resultAccuracy?: number;
  onClose: () => void;
}

/** Shareable profile/result card — copy text, download PNG, or Web Share image. */
export const ShareResultCard: React.FC<ShareResultCardProps> = ({
  username,
  displayName,
  bestWpm,
  avgAccuracy,
  totalTests,
  resultWpm,
  resultAccuracy,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/u/${username}`
      : `/u/${username}`;

  const statsLine =
    resultWpm != null
      ? `${Math.round(resultWpm)} WPM · ${Number(resultAccuracy ?? 0).toFixed(1)}% accuracy`
      : `best ${Math.round(Number(bestWpm))} WPM · ${Number(avgAccuracy).toFixed(1)}% avg accuracy · ${totalTests} tests`;

  const blurb = `${displayName} on TactileType — ${statsLine}\n${url}`;

  const cardStats = {
    displayName,
    username,
    bestWpm,
    avgAccuracy,
    totalTests,
    resultWpm,
    resultAccuracy,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(blurb);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const shareImage = async () => {
    setBusy(true);
    setImageStatus(null);
    try {
      const result = await shareCardImage(cardStats);
      setImageStatus(
        result === 'shared'
          ? 'Shared!'
          : result === 'copied'
            ? 'Image copied to clipboard'
            : 'PNG downloaded'
      );
    } catch {
      setImageStatus('Could not export image');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      await downloadShareCard(cardStats);
      setImageStatus('PNG downloaded');
    } catch {
      setImageStatus('Download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Share profile card"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-primary border border-accent/30 rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-accent/20">
          <h3 className="font-semibold">Share card</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-6 bg-gradient-to-br from-accent/25 to-accent/5">
          <div
            ref={cardRef}
            className="rounded-xl bg-primary/80 border border-accent/30 p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <img
                src="/tactiletype-256x256.png"
                alt=""
                className="size-8"
                width={32}
                height={32}
              />
              <span className="font-bold">tactiletype</span>
            </div>
            <div>
              <p className="text-xl font-bold">{displayName}</p>
              <p className="text-sm text-text/50">@{username}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-mono font-bold text-accent">
                  {resultWpm != null
                    ? Math.round(resultWpm)
                    : Math.round(Number(bestWpm))}
                </p>
                <p className="text-[10px] uppercase text-text/40">
                  {resultWpm != null ? 'WPM' : 'Best WPM'}
                </p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-accent">
                  {resultAccuracy != null
                    ? Number(resultAccuracy).toFixed(0)
                    : Number(avgAccuracy).toFixed(0)}
                  %
                </p>
                <p className="text-[10px] uppercase text-text/40">Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-accent">
                  {totalTests}
                </p>
                <p className="text-[10px] uppercase text-text/40">Tests</p>
              </div>
            </div>
          </div>
        </div>

        {imageStatus && (
          <p className="px-4 text-xs text-text/50" role="status">
            {imageStatus}
          </p>
        )}

        <div className="p-4 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="size-4" />
            {copied ? 'Copied!' : 'Copy text'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={download}
            disabled={busy}
          >
            <Download className="size-4" />
            PNG
          </Button>
          <Button size="sm" onClick={shareImage} disabled={busy}>
            <ImageIcon className="size-4" />
            {busy ? '…' : 'Share image'}
          </Button>
        </div>
      </div>
    </div>
  );
};
