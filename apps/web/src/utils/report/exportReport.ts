import type { ReportModel } from './buildReport';

/** `Monthly typing report` → `monthly-typing-report`. */
const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function reportFilename(report: ReportModel, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `tactiletype-${slug(report.periodLabel)}-report-${stamp}.${extension}`;
}

/**
 * Opens the browser's print dialog for the portalled sheet.
 *
 * The document title is swapped first because that is what browsers offer as
 * the default filename in "Save as PDF" — leaving it would suggest the name of
 * whatever page the user was on.
 */
/**
 * Resolves once every image below `root` has decoded.
 *
 * Printing captures what is painted at the instant it is called, and the print
 * portal mounts fresh <img> elements — so without this the charts and the logo
 * can be absent from the PDF even though they are visible in the preview.
 */
export async function whenImagesReady(root: HTMLElement | null): Promise<void> {
  if (!root) return;
  await Promise.all(
    Array.from(root.querySelectorAll('img')).map((image) =>
      // A broken image shouldn't block the print; it just prints without it.
      image.decode().catch(() => undefined)
    )
  );
}

export function printReport(report: ReportModel): void {
  const previous = document.title;
  document.title = reportFilename(report, 'pdf').replace(/\.pdf$/, '');
  // Only while this class is set does print hide the rest of the app — see the
  // print block in index.css.
  document.body.classList.add('printing-report');

  const restore = () => {
    document.title = previous;
    document.body.classList.remove('printing-report');
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);

  window.print();

  // Safari has historically not fired afterprint; without this the tab keeps
  // the report's name and the app stays unprintable.
  window.setTimeout(restore, 60_000);
}

export function downloadReportJson(report: ReportModel): void {
  // Chart images are megabytes of base64 and meaningless in a data file — the
  // points they were drawn from are already here.
  const { charts, ...rest } = report;
  const payload = {
    ...rest,
    charts: charts.map((chart) => ({
      type: chart.type,
      title: chart.title,
      caption: chart.caption,
      trendPercentage: chart.trendPercentage,
      points: chart.points,
    })),
  };

  download(
    reportFilename(report, 'json'),
    new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
  );
}

/**
 * Every stylesheet the page has, minus the app's own @font-face rules.
 *
 * Those point at relative /fonts/ URLs that resolve to nothing once the file is
 * saved elsewhere, so a data-URI copy is prepended in their place.
 */
function collectStyles(): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) continue;
        parts.push(rule.cssText);
      }
    } catch {
      // A cross-origin sheet cannot be read by design. Nothing to recover.
    }
  }
  return parts.join('\n');
}

/** Base64 without blowing the argument limit on a large buffer. */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Inlines the Latin subset only. One variable file covers 100–900, so the whole
 * weight range costs ~40KB; the extended and italic subsets would double that
 * for glyphs a report of numbers and English headings never reaches for.
 */
async function inlineFont(): Promise<string> {
  try {
    const response = await fetch('/fonts/saira-latin.woff2');
    if (!response.ok) return '';
    const base64 = toBase64(await response.arrayBuffer());
    return `@font-face{font-family:'Saira';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${base64}) format('woff2')}`;
  } catch {
    // Falls back to the generic stack in the sheet's own font-family.
    return '';
  }
}

/**
 * The sheet fills its container by design — on the analytics page an A4 frame
 * supplies the width. A saved file has no such frame, so it sets the page size
 * itself and centres it on a desk-coloured backdrop.
 */
const STANDALONE_SHELL = `
  html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
  body{margin:0;padding:32px 16px;background:#f4f4f2;font-family:'Saira',ui-sans-serif,system-ui,sans-serif}
  [data-report-sheet]{width:210mm;max-width:100%;margin:0 auto}
  @media print{
    body{padding:0;background:#fff}
    [data-report-sheet]{width:auto;margin:0}
  }
`;

/**
 * Serialises the sheet with every image turned into a data URI.
 *
 * Charts already carry theirs, but the logo is an ordinary path — fine in the
 * app, a broken image the moment the file is opened from a download folder.
 * Works on a clone so the live preview is left alone.
 */
async function serialiseWithImages(sheet: HTMLElement): Promise<string> {
  const clone = sheet.cloneNode(true) as HTMLElement;

  await Promise.all(
    Array.from(clone.querySelectorAll('img')).map(async (image) => {
      const src = image.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      try {
        const response = await fetch(src);
        if (!response.ok) return;
        const blob = await response.blob();
        const base64 = toBase64(await blob.arrayBuffer());
        image.setAttribute('src', `data:${blob.type || 'image/png'};base64,${base64}`);
      } catch {
        // Leave the original path. The report loses one image rather than
        // failing to save at all.
      }
    })
  );

  return clone.outerHTML;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Serialises the live sheet into a file that stands on its own — styles, font
 * and charts all inlined, so it renders identically with no network at all.
 */
export async function downloadReportHtml(report: ReportModel, sheet: HTMLElement): Promise<void> {
  const [font, body] = [await inlineFont(), await serialiseWithImages(sheet)];
  const styles = collectStyles();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.title)} · ${escapeHtml(report.rangeLabel)}</title>
<style>${font}</style>
<style>${styles}</style>
<style>${STANDALONE_SHELL}</style>
</head>
<body>
${body}
</body>
</html>`;

  download(reportFilename(report, 'html'), new Blob([html], { type: 'text/html;charset=utf-8' }));
}
