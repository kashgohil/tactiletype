import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  FONT_SIZE_CLASS,
  useTestPreferences,
} from "@/hooks/useTestPreferences";
import { cn } from "@/lib/utils";
import { codeTokenClass, type CodeToken } from "@/utils/codeHighlight";
import { motion } from "motion/react";
import React, { useLayoutEffect, useState } from "react";

export type CharStatus = "correct" | "incorrect" | "current" | "pending";

type CaretBox = { x: number; y: number; w: number; h: number };

/** A second caret drawn on the same line — e.g. the ghost pace marker. */
export interface SurfaceMarker {
  index: number;
  /** Tailwind classes for the marker body. */
  className?: string;
  title?: string;
}

export interface TypingSurfaceProps {
  text: string;
  /** Per-character state. Defaults to a plain diff against `typed`. */
  getStatus?: (index: number) => CharStatus;
  /** Convenience source for `getStatus` when the mode keeps a typed string. */
  typed?: string;
  /** Where the caret sits. `null` hides it (results / finished runs). */
  caretIndex: number | null;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  ariaLabel?: string;
  /** Char-level code tints (main test only). */
  codeTokens?: CodeToken[] | null;
  markers?: SurfaceMarker[];
  /** Center the block — used by the one-word arcade modes. */
  center?: boolean;
  /** Lets the caret park one slot past the last character. */
  trailingAnchor?: boolean;
  /** Set false where the mode paints its own focus affordance. */
  focusOverlay?: boolean;
  className?: string;
  /** Read-only display (a phrase being memorised, a finished run). */
  interactive?: boolean;
}

/**
 * The typing surface shared by the main test and every play mode: word-wrapped
 * characters as flex lines, the preference-driven caret, and the focus veil.
 *
 * Layout gotcha: this is a `flex flex-wrap` box where each character is a flex
 * item and each word a line, so vertical rhythm comes from `gap-y-*`, not
 * `leading-*`.
 */
export const TypingSurface: React.FC<TypingSurfaceProps> = ({
  text,
  getStatus,
  typed,
  caretIndex,
  onKeyDown,
  surfaceRef,
  ariaLabel = "Typing test area",
  codeTokens,
  markers,
  center,
  trailingAnchor,
  focusOverlay = true,
  className,
  interactive = true,
}) => {
  const { prefs } = useTestPreferences();
  const reducedMotion = usePrefersReducedMotion();
  const smoothCaret = prefs.smoothCaret && !reducedMotion;
  const [focused, setFocused] = useState(true);
  const [caretBox, setCaretBox] = useState<CaretBox | null>(null);
  const [markerBoxes, setMarkerBoxes] = useState<(CaretBox | null)[]>([]);
  const markerKey = (markers ?? []).map((m) => m.index).join(",");

  const status = (index: number): CharStatus => {
    if (getStatus) return getStatus(index);
    const t = typed ?? "";
    if (index < t.length) return t[index] === text[index] ? "correct" : "incorrect";
    if (index === t.length) return "current";
    return "pending";
  };

  // Single GPU caret: measure the active character and retarget the transform.
  useLayoutEffect(() => {
    const container = surfaceRef.current;
    if (!container || (!text && !trailingAnchor)) {
      setCaretBox(null);
      setMarkerBoxes([]);
      return;
    }

    const boxFor = (index: number): CaretBox | null => {
      const el = container.querySelector(
        `[data-char-index="${index}"]`,
      ) as HTMLElement | null;
      if (!el) return null;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const style = getComputedStyle(container);
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      return {
        x: eRect.left - cRect.left - borderLeft + container.scrollLeft,
        y: eRect.top - cRect.top - borderTop + container.scrollTop,
        w: Math.max(eRect.width, 1),
        h: Math.max(eRect.height, 1),
      };
    };

    const measure = () => {
      setCaretBox(caretIndex === null ? null : boxFor(caretIndex));
      setMarkerBoxes((markers ?? []).map((m) => boxFor(m.index)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    container.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      container.removeEventListener("scroll", measure);
    };
    // `markers` is rebuilt on every render, so `markerKey` stands in for it —
    // depending on the array itself would remeasure in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    caretIndex,
    text,
    trailingAnchor,
    markerKey,
    prefs.fontSize,
    prefs.caretStyle,
    focused,
    surfaceRef,
  ]);

  // Keep the caret in view on long passages that scroll inside the surface.
  useLayoutEffect(() => {
    const container = surfaceRef.current;
    if (!container || !caretBox) return;
    const top = caretBox.y;
    const bottom = caretBox.y + caretBox.h;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (bottom > viewBottom - caretBox.h) {
      container.scrollTop = bottom - container.clientHeight + caretBox.h * 2;
    } else if (top < viewTop) {
      container.scrollTop = Math.max(0, top - caretBox.h);
    }
  }, [caretBox, surfaceRef]);

  const renderCharacter = (char: string, index: number) => {
    const charStatus = status(index);
    const hi = prefs.highContrastTyped;
    const token = codeTokens?.[index];

    let className = "relative ";
    switch (charStatus) {
      case "correct":
        // No fill behind typed characters — the colour shift alone marks them.
        className += hi
          ? "text-text opacity-100 border-b-2 border-accent/70"
          : "text-text";
        break;
      case "incorrect":
        className += hi
          ? "text-rose-500 bg-rose-500/15 border-b-2 border-rose-500/80"
          : "text-rose-500";
        break;
      case "current":
        className += hi ? "text-text/45" : "text-text/50";
        break;
      default:
        className += hi ? "text-text/35" : "text-text/50";
    }

    if (token && charStatus !== "incorrect") {
      const tint = codeTokenClass(token, charStatus);
      if (tint) {
        className = className
          .replace(/text-text(\/\d+)?/g, "")
          .replace(/opacity-100/g, "")
          .trim();
        className += " " + tint;
        if (charStatus === "correct" && hi) {
          className += " border-b-2 border-accent/70";
        }
      }
    }

    return (
      <div
        key={index}
        data-char-index={index}
        className={cn(
          className,
          smoothCaret ? "transition-colors duration-200" : "transition-none",
        )}
      >
        {char === " " ? " " : char}
      </div>
    );
  };

  const words = () => {
    let counter = 0;
    const chunks = text.split(" ");
    return chunks.map((word, wordIndex) => (
      <div className="flex items-center" key={wordIndex}>
        {word.split("").map((char) => renderCharacter(char, counter++))}
        {wordIndex < chunks.length - 1 && renderCharacter(" ", counter++)}
      </div>
    ));
  };

  const caretTransition = smoothCaret
    ? { type: "spring" as const, stiffness: 500, damping: 35, mass: 0.4 }
    : { duration: 0 };

  const caretShape = (box: CaretBox, override?: string) => {
    const style = prefs.caretStyle;
    const pulse = !reducedMotion ? "animate-pulse" : "";
    let className = "absolute top-0 left-0 pointer-events-none z-[1] ";
    let size: React.CSSProperties = {};

    switch (style) {
      case "block":
        className += cn(override ?? "bg-accent/35", "rounded-sm", pulse);
        size = { width: box.w, height: box.h };
        break;
      case "underline":
        className += override ?? "bg-accent";
        className += " h-0.5";
        size = { width: box.w, height: 2 };
        break;
      case "box":
        className += cn(
          "border-2 rounded-sm",
          override ?? "border-accent",
          pulse,
        );
        size = { width: box.w, height: box.h };
        break;
      case "line":
      default:
        className += cn(override ?? "bg-accent", pulse);
        size = { width: 3, height: box.h };
        break;
    }

    const y = style === "underline" ? box.y + box.h - 2 : box.y;
    return { className, size, y };
  };

  const renderCaret = () => {
    if (!caretBox) return null;
    const { className, size, y } = caretShape(caretBox);
    return (
      <motion.div
        aria-hidden
        className={className}
        style={size}
        initial={false}
        animate={{ transform: `translate3d(${caretBox.x}px, ${y}px, 0)` }}
        transition={caretTransition}
        data-allow-transform-motion=""
      />
    );
  };

  const renderMarkers = () =>
    (markers ?? []).map((marker, i) => {
      const box = markerBoxes[i];
      if (!box) return null;
      const { className, size, y } = caretShape(box, marker.className);
      return (
        <motion.div
          key={`${marker.index}-${i}`}
          aria-hidden
          title={marker.title}
          className={cn(className, "opacity-70")}
          style={size}
          initial={false}
          animate={{ transform: `translate3d(${box.x}px, ${y}px, 0)` }}
          transition={caretTransition}
          data-allow-transform-motion=""
        />
      );
    });

  return (
    <div
      className={cn(
        // Flex-wrap container: each word is a flex line, so the space between
        // lines is row-gap (gap-y-*), not line-height.
        "p-8 mt-4 mb-6 flex flex-wrap gap-y-4 leading-loose font-mono select-none outline-none relative max-h-[50vh] overflow-y-auto",
        center && "justify-center content-center text-center",
        FONT_SIZE_CLASS[prefs.fontSize],
        className,
      )}
      onKeyDown={onKeyDown}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onClick={() => surfaceRef.current?.focus()}
      tabIndex={interactive ? 0 : -1}
      ref={surfaceRef}
      role={interactive ? 'textbox' : undefined}
      aria-label={ariaLabel}
      aria-multiline={interactive ? true : undefined}
      data-keyboard-layout={prefs.keyboardLayout}
    >
      {interactive && focusOverlay && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all delay-300 text-center backdrop-blur-none opacity-0 z-1 pointer-events-none",
            !focused && "backdrop-blur-sm opacity-100",
          )}
          aria-hidden={focused}
        >
          Click here to focus
        </div>
      )}

      {words()}
      {trailingAnchor && (
        <div
          data-char-index={text.length}
          aria-hidden
          className="opacity-0 select-none"
        >
          {" "}
        </div>
      )}
      {renderMarkers()}
      {renderCaret()}
    </div>
  );
};
