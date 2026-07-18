import { ThemeContext } from "@/contexts/ThemeContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { DetailedKeystrokeEvent } from "@tactile/types";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import { Activity, AlertTriangle, Gauge, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import React, { useContext, useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface TimelineChartProps {
  keystrokeEvents: DetailedKeystrokeEvent[];
  height?: number;
  className?: string;
}

interface TimelinePoint {
  second: number;
  /** Rolling WPM over a short window — more expressive than cumulative. */
  wpm: number;
  /** Cumulative WPM through this second (tooltip secondary). */
  cumulativeWpm: number;
  errors: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return `rgba(206, 177, 30, ${alpha})`;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ROLLING_WINDOW_S = 3;

export const TimelineChart: React.FC<TimelineChartProps> = ({
  keystrokeEvents,
  height = 240,
  className,
}) => {
  const context = useContext(ThemeContext);
  const theme = context?.themeToApply;
  const reducedMotion = usePrefersReducedMotion();
  const chartRef = useRef<ChartJS<"line"> | null>(null);

  const accent = theme?.accentColor || "#ceb11e";
  const text = theme?.textColor || "#333333";
  const primary = theme?.primaryColor || "#edebe1";

  const { points, peakWpm, avgWpm, totalErrors, peakSecond, errorSeconds } =
    useMemo(() => {
      if (!keystrokeEvents.length) {
        return {
          points: [] as TimelinePoint[],
          peakWpm: 0,
          avgWpm: 0,
          totalErrors: 0,
          peakSecond: 0,
          errorSeconds: 0,
        };
      }

      const startTime = keystrokeEvents[0].timestamp;
      const maxTime = Math.max(...keystrokeEvents.map((e) => e.timestamp));
      const totalSeconds = Math.max(1, Math.ceil((maxTime - startTime) / 1000));
      const data: TimelinePoint[] = [];

      for (let second = 1; second <= totalSeconds; second++) {
        const secondEnd = startTime + second * 1000;
        const windowStart = startTime + Math.max(0, second - ROLLING_WINDOW_S) * 1000;

        const inWindow = keystrokeEvents.filter(
          (e) => e.timestamp >= windowStart && e.timestamp < secondEnd,
        );
        const correctInWindow = inWindow.filter(
          (e) => e.correct && !e.isBackspace,
        ).length;
        const windowMinutes = Math.min(second, ROLLING_WINDOW_S) / 60;
        const wpm =
          windowMinutes > 0
            ? Math.round(correctInWindow / 5 / windowMinutes)
            : 0;

        const upTo = keystrokeEvents.filter((e) => e.timestamp < secondEnd);
        const correctUpTo = upTo.filter(
          (e) => e.correct && !e.isBackspace,
        ).length;
        const elapsedMin = second / 60;
        const cumulativeWpm =
          elapsedMin > 0 ? Math.round(correctUpTo / 5 / elapsedMin) : 0;

        const secondStart = startTime + (second - 1) * 1000;
        const errors = keystrokeEvents.filter(
          (e) =>
            e.timestamp >= secondStart &&
            e.timestamp < secondEnd &&
            !e.correct &&
            !e.isBackspace,
        ).length;

        data.push({ second, wpm, cumulativeWpm, errors });
      }

      let peak = 0;
      let peakAt = 1;
      let errSum = 0;
      let errSecs = 0;
      let wpmSum = 0;
      for (const p of data) {
        if (p.wpm > peak) {
          peak = p.wpm;
          peakAt = p.second;
        }
        errSum += p.errors;
        if (p.errors > 0) errSecs += 1;
        wpmSum += p.wpm;
      }

      return {
        points: data,
        peakWpm: peak,
        avgWpm: data.length ? Math.round(wpmSum / data.length) : 0,
        totalErrors: errSum,
        peakSecond: peakAt,
        errorSeconds: errSecs,
      };
    }, [keystrokeEvents]);

  const wpmGradient = (
    ctx: ScriptableContext<"line">,
  ): CanvasGradient | string => {
    const chart = ctx.chart;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return hexToRgba(accent, 0.12);
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexToRgba(accent, 0.38));
    g.addColorStop(0.55, hexToRgba(accent, 0.1));
    g.addColorStop(1, hexToRgba(accent, 0));
    return g;
  };

  const chartData: ChartData<"line"> = useMemo(() => {
    const wpms = points.map((d) => d.wpm);
    const errs = points.map((d) => d.errors);
    const peakIdx = points.findIndex((d) => d.second === peakSecond);

    return {
      labels: points.map((d) => `${d.second}s`),
      datasets: [
        {
          label: "WPM",
          data: wpms,
          borderColor: accent,
          backgroundColor: wpmGradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.42,
          cubicInterpolationMode: "monotone",
          pointRadius: points.map((_, i) => (i === peakIdx ? 5 : 0)),
          pointHoverRadius: 6,
          pointBackgroundColor: accent,
          pointBorderColor: primary,
          pointBorderWidth: 2,
          pointHoverBackgroundColor: accent,
          pointHoverBorderColor: primary,
          pointHoverBorderWidth: 2,
          yAxisID: "y",
          order: 2,
        },
        {
          label: "Errors",
          data: errs.map((e) => (e > 0 ? e : null)) as (number | null)[],
          borderColor: "transparent",
          backgroundColor: "rgb(244, 63, 94)",
          showLine: false,
          pointRadius: errs.map((e) => (e > 0 ? Math.min(4 + e * 1.5, 10) : 0)),
          pointHoverRadius: errs.map((e) =>
            e > 0 ? Math.min(6 + e * 1.5, 12) : 0,
          ),
          pointBackgroundColor: errs.map((e) =>
            e > 0 ? "rgba(244, 63, 94, 0.9)" : "transparent",
          ),
          pointBorderColor: errs.map((e) =>
            e > 0 ? hexToRgba(primary, 0.85) : "transparent",
          ),
          pointBorderWidth: 1.5,
          yAxisID: "y1",
          order: 1,
        },
      ],
    };
    // wpmGradient closes over accent/primary; recompute when those change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, peakSecond, accent, primary]);

  const mutedTick = hexToRgba(text, 0.42);
  const gridColor = hexToRgba(text, 0.07);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion
        ? false
        : {
            duration: 900,
            easing: "easeOutQuart",
          },
      animations: reducedMotion
        ? undefined
        : {
            x: { duration: 0 },
            y: {
              duration: 900,
              easing: "easeOutQuart",
              from: (ctx) => {
                if (ctx.type !== "data" || ctx.mode !== "default") return;
                return ctx.chart.scales.y?.bottom;
              },
            },
          },
      layout: {
        padding: { top: 8, right: 4, left: 0, bottom: 0 },
      },
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: hexToRgba(text, 0.92),
          titleColor: primary,
          bodyColor: primary,
          borderColor: hexToRgba(accent, 0.45),
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          displayColors: false,
          titleFont: { family: "IBM Plex Mono, ui-monospace, monospace", size: 11, weight: 600 },
          bodyFont: { family: "Saira, system-ui, sans-serif", size: 12 },
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex ?? 0;
              const p = points[idx];
              if (!p) return "";
              return `t = ${p.second}s`;
            },
            label: (item) => {
              const p = points[item.dataIndex];
              if (!p) return "";
              if (item.dataset.label === "Errors") {
                return p.errors
                  ? `${p.errors} error${p.errors === 1 ? "" : "s"} this second`
                  : "";
              }
              return [
                `${p.wpm} WPM  ·  rolling ${ROLLING_WINDOW_S}s`,
                `${p.cumulativeWpm} WPM cumulative`,
              ];
            },
            afterBody: (items) => {
              const p = points[items[0]?.dataIndex ?? 0];
              if (!p || p.errors === 0 || items[0]?.dataset.label === "Errors")
                return [];
              return [
                `${p.errors} error${p.errors === 1 ? "" : "s"} this second`,
              ];
            },
          },
          filter: (item) => {
            // Hide empty error tooltips when hovering non-error points on that dataset
            if (item.dataset.label === "Errors") {
              const v = item.parsed.y;
              return v != null && v > 0;
            }
            return true;
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: mutedTick,
            font: {
              family: "IBM Plex Mono, ui-monospace, monospace",
              size: 11,
            },
            maxRotation: 0,
            autoSkipPadding: 16,
            callback: function (value, index) {
              const label = this.getLabelForValue(value as number);
              // Show first, last, and sparse mid ticks
              const n = points.length;
              if (n <= 12) return label;
              if (index === 0 || index === n - 1) return label;
              if (index % Math.ceil(n / 6) === 0) return label;
              return "";
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          suggestedMax: Math.max(peakWpm * 1.12, 20),
          border: { display: false },
          grid: {
            color: gridColor,
            drawTicks: false,
          },
          ticks: {
            color: mutedTick,
            font: {
              family: "IBM Plex Mono, ui-monospace, monospace",
              size: 11,
            },
            padding: 8,
            maxTicksLimit: 5,
            callback: (v) => `${v}`,
          },
          title: {
            display: true,
            text: "WPM",
            color: mutedTick,
            font: {
              family: "Saira, system-ui, sans-serif",
              size: 11,
              weight: 500,
            },
            padding: { bottom: 4 },
          },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          suggestedMax: Math.max(
            3,
            ...points.map((p) => p.errors),
            1,
          ) * 1.4,
          border: { display: false },
          grid: { drawOnChartArea: false, display: false },
          ticks: {
            color: hexToRgba("f43f5e", 0.65),
            font: {
              family: "IBM Plex Mono, ui-monospace, monospace",
              size: 11,
            },
            padding: 8,
            stepSize: 1,
            maxTicksLimit: 4,
            callback: (v) => (Number(v) === 0 ? "" : `${v}`),
          },
          title: {
            display: totalErrors > 0,
            text: "Errors",
            color: hexToRgba("f43f5e", 0.65),
            font: {
              family: "Saira, system-ui, sans-serif",
              size: 11,
              weight: 500,
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      elements: {
        line: {
          borderJoinStyle: "round",
          borderCapStyle: "round",
        },
      },
    }),
    [
      reducedMotion,
      mutedTick,
      gridColor,
      accent,
      text,
      primary,
      points,
      peakWpm,
      totalErrors,
    ],
  );

  if (!points.length) {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-accent/20 bg-accent/10 px-6 py-10 text-center",
          className,
        )}
      >
        <p className="font-saira text-sm text-text/50">
          No keystroke data to chart for this run.
        </p>
      </div>
    );
  }

  const stats = [
    {
      icon: TrendingUp,
      label: "Peak",
      value: `${peakWpm}`,
      unit: "wpm",
      hint: `at ${peakSecond}s`,
      accent: true,
    },
    {
      icon: Gauge,
      label: "Avg pace",
      value: `${avgWpm}`,
      unit: "wpm",
      hint: `${ROLLING_WINDOW_S}s window`,
      accent: false,
    },
    {
      icon: AlertTriangle,
      label: "Errors",
      value: `${totalErrors}`,
      unit: totalErrors === 1 ? "miss" : "misses",
      hint: errorSeconds
        ? `${errorSeconds}s with slips`
        : "clean run",
      accent: false,
      danger: totalErrors > 0,
    },
    {
      icon: Activity,
      label: "Duration",
      value: `${points.length}`,
      unit: "sec",
      hint: "full session",
      accent: false,
    },
  ] as const;

  return (
    <motion.div
      className={cn(
        "w-full max-w-6xl rounded-2xl border border-accent/20 bg-accent/10 overflow-hidden shadow-sm",
        className,
      )}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-5 pb-3 border-b border-accent/10">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text/40">
            Session timeline
          </p>
          <h3 className="font-saira text-lg font-semibold text-text leading-tight">
            How your pace moved
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-saira text-text/45">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            Rolling WPM
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" />
            Errors
          </span>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-accent/10 border-b border-accent/10">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              className="flex flex-col gap-1.5 bg-primary/40 px-5 py-3.5"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: reducedMotion ? 0 : 0.05 + i * 0.04,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text/40 font-saira">
                <Icon className="size-3 opacity-70" aria-hidden />
                {s.label}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-mono text-2xl font-semibold tabular-nums leading-none",
                    "danger" in s && s.danger
                      ? "text-rose-500"
                      : s.accent
                        ? "text-accent"
                        : "text-text",
                  )}
                >
                  {s.value}
                </span>
                <span className="font-mono text-xs text-text/40">{s.unit}</span>
              </div>
              <span className="font-mono text-[10px] text-text/35">{s.hint}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="px-4 sm:px-6 py-5">
        <div style={{ height: `${height}px`, width: "100%" }} className="relative">
          {/* Soft accent glow behind the curve */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-1/2 rounded-full opacity-40 blur-3xl"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(accent, 0.35)}, transparent 70%)`,
            }}
          />
          <Line ref={chartRef} data={chartData} options={options} />
        </div>
      </div>
    </motion.div>
  );
};
