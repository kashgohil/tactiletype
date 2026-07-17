import { Button } from '@/components/ui/button';
import { Copy, X } from 'lucide-react';
import React, { useState } from 'react';

interface ShareResultCardProps {
  username: string;
  displayName: string;
  bestWpm: number;
  avgAccuracy: number;
  totalTests: number;
  onClose: () => void;
}

/** Lightweight shareable profile/result card (copy text or Web Share). */
export const ShareResultCard: React.FC<ShareResultCardProps> = ({
  username,
  displayName,
  bestWpm,
  avgAccuracy,
  totalTests,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/u/${username}`
      : `/u/${username}`;

  const blurb = `${displayName} on TactileType — best ${Math.round(Number(bestWpm))} WPM · ${Number(avgAccuracy).toFixed(1)}% avg accuracy · ${totalTests} tests\n${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(blurb);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName} on TactileType`,
          text: blurb,
          url,
        });
      } else {
        await copy();
      }
    } catch {
      // cancelled
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Share profile card"
    >
      <div className="bg-primary border border-accent/30 rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-accent/20">
          <h3 className="font-semibold">Share card</h3>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        {/* Visual card */}
        <div className="p-6 bg-gradient-to-br from-accent/25 to-accent/5">
          <div className="rounded-xl bg-primary/80 border border-accent/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/tactiletype-256x256.png"
                alt=""
                className="size-8"
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
                  {Math.round(Number(bestWpm))}
                </p>
                <p className="text-[10px] uppercase text-text/40">Best WPM</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-accent">
                  {Number(avgAccuracy).toFixed(0)}%
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

        <div className="p-4 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="size-4" />
            {copied ? 'Copied!' : 'Copy text'}
          </Button>
          <Button size="sm" onClick={share}>
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};
