/**
 * Lightweight char-level token tags for code typing (no Prism/shiki).
 * Tokens tint pending/correct glyphs; typing status still owns contrast.
 */

export type CodeToken =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'punct'
  | 'plain';

const KEYWORDS = new Set(
  [
    'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
    'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
    'false', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import',
    'in', 'instanceof', 'interface', 'let', 'new', 'null', 'of', 'package',
    'private', 'protected', 'public', 'return', 'static', 'super', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
    'yield', 'type', 'as', 'def', 'elif', 'except', 'lambda', 'pass', 'print',
    'raise', 'None', 'True', 'False', 'and', 'or', 'not', 'fn', 'mut', 'impl',
    'struct', 'match', 'use', 'pub', 'mod', 'SELECT', 'FROM', 'WHERE', 'JOIN',
    'LEFT', 'RIGHT', 'INNER', 'ON', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'INSERT',
    'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX',
  ].map((k) => k.toLowerCase())
);

/** Per-character token array matching `text` length. */
export function tokenizeCodeChars(text: string): CodeToken[] {
  const out: CodeToken[] = new Array(text.length).fill('plain');
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;

    // Line comment //
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        out[i] = 'comment';
        i++;
      }
      continue;
    }

    // Hash comment (python/shell)
    if (ch === '#') {
      while (i < text.length && text[i] !== '\n') {
        out[i] = 'comment';
        i++;
      }
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out[i] = 'string';
      i++;
      while (i < text.length) {
        out[i] = 'string';
        if (text[i] === '\\' && i + 1 < text.length) {
          out[i + 1] = 'string';
          i += 2;
          continue;
        }
        if (text[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Numbers
    if (/\d/.test(ch)) {
      while (i < text.length && /[\d._xXa-fA-F]/.test(text[i]!)) {
        out[i] = 'number';
        i++;
      }
      continue;
    }

    // Identifiers / keywords
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      while (i < text.length && /[A-Za-z0-9_$]/.test(text[i]!)) i++;
      const word = text.slice(start, i);
      const tok: CodeToken = KEYWORDS.has(word.toLowerCase())
        ? 'keyword'
        : 'plain';
      for (let j = start; j < i; j++) out[j] = tok;
      continue;
    }

    // Punctuation / operators
    if (/[{}()[\].,;:<>!=+\-*/%&|^~?]/.test(ch)) {
      out[i] = 'punct';
      i++;
      continue;
    }

    i++;
  }

  return out;
}

/** Soft tint classes for pending characters (status classes override on type). */
export function codeTokenClass(token: CodeToken, status: string): string {
  // Errors always win
  if (status === 'incorrect') return '';
  // Soft hues only for untyped / current so correct trail stays high-contrast
  if (status === 'correct') {
    switch (token) {
      case 'keyword':
        return 'text-sky-700 dark:text-sky-300';
      case 'string':
        return 'text-emerald-700 dark:text-emerald-300';
      case 'comment':
        return 'text-text/50 italic';
      case 'number':
        return 'text-amber-700 dark:text-amber-300';
      case 'punct':
        return 'text-fuchsia-700 dark:text-fuchsia-300';
      default:
        return '';
    }
  }
  // pending / current
  switch (token) {
    case 'keyword':
      return 'text-sky-600/50 dark:text-sky-400/40';
    case 'string':
      return 'text-emerald-600/50 dark:text-emerald-400/40';
    case 'comment':
      return 'text-text/25 italic';
    case 'number':
      return 'text-amber-600/50 dark:text-amber-400/40';
    case 'punct':
      return 'text-fuchsia-600/45 dark:text-fuchsia-400/40';
    default:
      return '';
  }
}
