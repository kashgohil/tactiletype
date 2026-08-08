import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
} from 'chart.js';
import type { ReportChart } from './buildReport';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

/**
 * The report renders on paper, not in the app's skin.
 *
 * A dark theme printed as-is floods the page with ink and reads as a bug, and a
 * standalone HTML report is opened outside the app where the theme does not
 * exist at all. So charts get a fixed graphite-on-white palette instead of the
 * live theme, which is the whole reason these canvases are rendered fresh here
 * rather than captured from the dashboard.
 */
const PAPER = {
  ink: '#1b1b1b',
  line: '#111111',
  fill: 'rgba(17, 17, 17, 0.08)',
  grid: 'rgba(27, 27, 27, 0.10)',
  axis: 'rgba(27, 27, 27, 0.45)',
  point: '#111111',
  pointBorder: '#ffffff',
} as const;

const UNITS: Record<ReportChart['type'], string> = {
  wpm: ' WPM',
  accuracy: '%',
  consistency: '%',
  time_spent: '',
};

/** Print needs real pixels — 2x keeps lines crisp at 300dpi without bloating the file. */
const SCALE = 2;
const WIDTH = 720;
const HEIGHT = 260;

/**
 * Draws one chart into a detached canvas and returns a PNG data URI.
 *
 * Detached rather than mounted because Chart.js ties itself to element size:
 * a mounted canvas re-lays-out when the print media query fires, which is the
 * classic way charts come out blank in a PDF. A fixed-size offscreen canvas
 * rasterised up front cannot be disturbed by any of that.
 */
export function renderChartImage(chart: ReportChart): string | undefined {
  if (chart.points.length < 2) return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  const unit = UNITS[chart.type] ?? '';

  const instance = new ChartJS(ctx, {
    type: 'line',
    data: {
      labels: chart.points.map((point) =>
        new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      ),
      datasets: [
        {
          data: chart.points.map((point) => point.value),
          borderColor: PAPER.line,
          backgroundColor: PAPER.fill,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: chart.points.length > 30 ? 0 : 2.5,
          pointBackgroundColor: PAPER.point,
          pointBorderColor: PAPER.pointBorder,
          pointBorderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: false,
      // Animation would leave a half-drawn frame in the capture below.
      animation: false,
      devicePixelRatio: SCALE,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          grid: { display: false },
          border: { color: PAPER.grid },
          ticks: {
            color: PAPER.axis,
            font: { size: 11 },
            maxRotation: 0,
            autoSkipPadding: 20,
          },
        },
        y: {
          beginAtZero: chart.type === 'wpm',
          min: chart.type === 'wpm' ? undefined : 0,
          max: chart.type === 'wpm' ? undefined : 100,
          grid: { color: PAPER.grid },
          border: { display: false },
          ticks: {
            color: PAPER.axis,
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: (value: string | number) =>
              `${typeof value === 'string' ? parseFloat(value) : value}${unit}`,
          },
        },
      },
    },
  });

  // Synchronous because animation is off — the canvas is complete on return.
  const image = canvas.toDataURL('image/png');
  instance.destroy();
  return image;
}

/** Rasterises every chart in the model, leaving the rest of it untouched. */
export function withChartImages(charts: ReportChart[]): ReportChart[] {
  return charts.map((chart) => ({ ...chart, image: renderChartImage(chart) }));
}
