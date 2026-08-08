/**
 * Page geometry and block packing for the printed report.
 *
 * The report paginates itself rather than leaving it to the browser, because a
 * running footer needs a page number and CSS cannot supply one: `@page` margin
 * boxes and `counter(page)` are specified but implemented by no major browser,
 * and a fixed-position footer has no idea which page it landed on.
 */

/** A4 less the 16mm/14mm page margins, minus a millimetre of slack so a
 *  rounding error can't spill a page over and leave blanks between sheets. */
export const PAGE_CONTENT_MM = 264;
export const CONTENT_WIDTH_MM = 182;

/**
 * Packs measured block heights into pages.
 *
 * Every page after the first loses the footer's height from its usable space,
 * which is why the limit is recomputed per page rather than fixed. Blocks are
 * never split: one taller than a whole page takes a page of its own and
 * overflows it, which is visible and fixable, unlike being silently cut.
 */
export function packPages(
  heights: number[],
  contentHeight: number,
  footerHeight: number
): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;

  heights.forEach((height, index) => {
    const limit =
      pages.length === 0 ? contentHeight : contentHeight - footerHeight;
    if (current.length && used + height > limit) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(index);
    used += height;
  });

  if (current.length) pages.push(current);
  return pages;
}
