import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Shows its child at true A4 width, scaled down to fit the space available.
 *
 * The point is fidelity: reflowing the document to whatever width the panel
 * happens to be tells you nothing about what will come out of a printer. At a
 * fixed 210mm the line lengths, type size and page proportions on screen are
 * the ones that will be printed - just smaller.
 *
 * Scaling is a transform rather than `zoom` because zoom only became broadly
 * supported recently and degrades to an overflowing, full-size page where it
 * isn't. A transform doesn't affect layout size, so the viewport is given an
 * explicit height to match what is actually visible.
 */
export const A4_WIDTH = '210mm';

export const A4Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const viewport = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const viewportEl = viewport.current;
    const pageEl = page.current;
    if (!viewportEl || !pageEl) return;

    const measure = () => {
      const available = viewportEl.clientWidth;
      // offsetHeight is the page's own layout height, unaffected by the
      // transform - which is what makes the arithmetic below stable.
      const natural = pageEl.offsetWidth;
      const naturalHeight = pageEl.offsetHeight;
      if (!available || !natural || !naturalHeight) return;

      // Never enlarge: a page shown bigger than A4 is as misleading as one
      // reflowed to the container.
      const nextScale = Math.min(1, available / natural);
      const nextHeight = naturalHeight * nextScale;

      setScale(nextScale);
      // Sub-pixel churn would otherwise keep the observer firing forever.
      setHeight((current) =>
        current !== undefined && Math.abs(current - nextHeight) < 0.5 ? current : nextHeight
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewportEl);
    // The page's own height changes whenever the report content does - a
    // toggled section, or a chart image finishing decoding.
    observer.observe(pageEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewport}
      // `items-start` is load-bearing, not cosmetic. A flex container with an
      // explicit height stretches its children to fill it, so the page would be
      // resized to the very height derived from it - and each observer pass
      // would scale that down again until the whole thing collapsed to a strip.
      // Holding the page at its natural height keeps the measurement stable.
      className="flex items-start justify-center overflow-hidden"
      style={{ height }}
    >
      <div
        ref={page}
        className="shrink-0"
        style={{
          width: A4_WIDTH,
          transform: `scale(${scale})`,
          // Centred origin so the page stays centred once scaled, even though
          // its layout box is still the full 210mm.
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
};
