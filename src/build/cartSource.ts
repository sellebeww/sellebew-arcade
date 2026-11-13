// Pure helpers for extracting and validating generated game cartridges.
// Kept free of browser/DOM dependencies so they can be unit-tested in Node.

export const CART_BEGIN_MARKER = "===BEGIN_VERIFIED_GAME_JS===";
export const CART_END_MARKER = "===END_VERIFIED_GAME_JS===";
export const MAX_CART_LINES = 400;

/** Tokens a cartridge must never contain (see agents/gamesmith/SYSTEM.md). */
const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
  ["window", /\bwindow\b/],
  ["document", /\bdocument\b/],
  ["globalThis", /\bglobalThis\b/],
  ["fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["WebSocket", /\bWebSocket\b/],
  ["import", /\bimport\s*[({"'`]/],
  ["eval", /\beval\s*\(/],
  ["Function", /\bnew\s+Function\b|\bFunction\s*\(/],
  ["setTimeout", /\bsetTimeout\b/],
  ["setInterval", /\bsetInterval\b/],
  ["Date", /\bDate\b/],
  ["Math.random", /\bMath\s*\.\s*random\b/],
];

export interface CartValidation {
  ok: boolean;
  reason?: string;
}

/**
 * Pull the verified cartridge out of agent output. Prefers the marker-delimited
 * block; falls back to the last fenced code block that exports `create`.
 */
export function extractCartSource(text: string): string | null {
  if (!text) return null;

  const begin = text.lastIndexOf(CART_BEGIN_MARKER);
  if (begin !== -1) {
    const from = begin + CART_BEGIN_MARKER.length;
    const end = text.indexOf(CART_END_MARKER, from);
    const body = (end === -1 ? text.slice(from) : text.slice(from, end)).trim();
    if (body) return body;
  }

  const fenced = [...text.matchAll(/```(?:js|javascript)?\s*\n([\s\S]*?)```/g)]
    .map((m) => m[1].trim())
    .filter((src) => /export\s+function\s+create\b/.test(src));
  return fenced.length ? fenced[fenced.length - 1] : null;
}

/** Cheap static checks. The real verification is the headless playtest. */
export function validateCartSource(source: string): CartValidation {
  if (!source || !source.trim()) return { ok: false, reason: "empty cartridge" };
  if (!/export\s+function\s+create\s*\(/.test(source)) {
    return { ok: false, reason: "missing `export function create(engine, card)`" };
  }
  const lines = source.split("\n").length;
  if (lines > MAX_CART_LINES) {
    return { ok: false, reason: `cartridge too long (${lines} lines)` };
  }
  for (const [name, pattern] of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      return { ok: false, reason: `forbidden token: ${name}` };
    }
  }
  return { ok: true };
}

/** Map an arbitrary error into the wording App.tsx uses to choose a toast. */
export function describeFallbackReason(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "unknown error");
  const lower = msg.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("took too long")) {
    return "timeout: took too long";
  }
  if (lower.includes("429") || lower.includes("rate") || lower.includes("quota") || lower.includes("packed")) {
    return "429: the arcade is packed";
  }
  return msg.slice(0, 200);
}
