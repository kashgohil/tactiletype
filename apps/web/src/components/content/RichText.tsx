import { Link } from '@tanstack/react-router';
import type React from 'react';

/**
 * Inline markup for authored copy. Two forms only:
 *   [label](/path)  → internal link (external if it starts with http)
 *   `code`          → inline code
 *
 * Deliberately not Markdown. Content lives in `src/content/*` as data so the
 * same strings can render as React, as plain text for the prerendered
 * `<noscript>` mirror, and as JSON-LD — and a full Markdown pipeline would drag
 * a parser into all three. Two constructs cover every case the copy needs.
 */
const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;

/** Router paths are a typed union; authored copy is plain strings. */
type AnyPath = never;

export const RichText: React.FC<{ text: string }> = ({ text }) => {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  // `matchAll` iterates against its own copy, so the shared /g literal's
  // stateful `lastIndex` never leaks between renders.
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));

    const [, label, href, code] = match;
    if (code) {
      nodes.push(
        <code
          key={match.index}
          className="rounded bg-accent/[0.1] px-1.5 py-0.5 text-[0.9em] tracking-tight"
        >
          {code}
        </code>
      );
    } else if (href.startsWith('http')) {
      nodes.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline"
        >
          {label}
        </a>
      );
    } else {
      nodes.push(
        <Link
          key={match.index}
          to={href as AnyPath}
          className="text-accent underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      );
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
};
