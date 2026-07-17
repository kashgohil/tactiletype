/**
 * Render a shareable stats card to a PNG via canvas (client-side, no deps).
 */

export interface ShareCardStats {
  displayName: string;
  username: string;
  bestWpm: number;
  avgAccuracy: number;
  totalTests: number;
  /** Optional single-result card fields */
  resultWpm?: number;
  resultAccuracy?: number;
  brand?: string;
}

const W = 1200;
const H = 630;

export async function renderShareCardPng(
  stats: ShareCardStats
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a1a18');
  grad.addColorStop(1, '#2d2a1f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Accent bar
  ctx.fillStyle = '#ceb11e';
  ctx.fillRect(0, 0, W, 12);

  // Card panel
  ctx.fillStyle = 'rgba(237, 235, 225, 0.06)';
  roundRect(ctx, 80, 80, W - 160, H - 160, 32);
  ctx.fill();

  ctx.fillStyle = '#ceb11e';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(stats.brand ?? 'tactiletype', 120, 160);

  ctx.fillStyle = '#f5f3e8';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(truncate(stats.displayName, 28), 120, 250);

  ctx.fillStyle = 'rgba(245, 243, 232, 0.55)';
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillText(`@${stats.username}`, 120, 300);

  const metrics =
    stats.resultWpm != null
      ? [
          { label: 'WPM', value: String(Math.round(stats.resultWpm)) },
          {
            label: 'ACCURACY',
            value: `${Number(stats.resultAccuracy ?? 0).toFixed(0)}%`,
          },
          { label: 'BEST', value: String(Math.round(Number(stats.bestWpm))) },
        ]
      : [
          { label: 'BEST WPM', value: String(Math.round(Number(stats.bestWpm))) },
          {
            label: 'ACCURACY',
            value: `${Number(stats.avgAccuracy).toFixed(0)}%`,
          },
          { label: 'TESTS', value: String(stats.totalTests) },
        ];

  const boxW = 280;
  const startX = 120;
  const y = 400;
  metrics.forEach((m, i) => {
    const x = startX + i * (boxW + 40);
    ctx.fillStyle = 'rgba(206, 177, 30, 0.12)';
    roundRect(ctx, x, y - 60, boxW, 140, 20);
    ctx.fill();
    ctx.fillStyle = '#ceb11e';
    ctx.font = 'bold 56px ui-monospace, monospace';
    ctx.fillText(m.value, x + 24, y + 20);
    ctx.fillStyle = 'rgba(245, 243, 232, 0.5)';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(m.label, x + 24, y + 55);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))),
      'image/png'
    );
  });
}

export async function downloadShareCard(stats: ShareCardStats, filename?: string) {
  const blob = await renderShareCardPng(stats);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `tactiletype-${stats.username}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareCardImage(stats: ShareCardStats): Promise<'shared' | 'downloaded' | 'copied'> {
  const blob = await renderShareCardPng(stats);
  const file = new File([blob], `tactiletype-${stats.username}.png`, {
    type: 'image/png',
  });

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: `${stats.displayName} on TactileType`,
      text: `${stats.displayName} — ${Math.round(Number(stats.bestWpm))} WPM on TactileType`,
    });
    return 'shared';
  }

  // Clipboard image if available
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return 'copied';
    }
  } catch {
    // fall through
  }

  await downloadShareCard(stats);
  return 'downloaded';
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
