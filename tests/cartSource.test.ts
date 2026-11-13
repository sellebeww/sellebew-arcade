import { describe, expect, it } from "vitest";
import {
  CART_BEGIN_MARKER,
  CART_END_MARKER,
  describeFallbackReason,
  extractCartSource,
  validateCartSource,
} from "../src/build/cartSource";

const GOOD = `export function create(engine, card) {\n  return { update() {}, draw() {} };\n}`;

describe("extractCartSource", () => {
  it("returns the marker-delimited block", () => {
    const text = `noise\n${CART_BEGIN_MARKER}\n${GOOD}\n${CART_END_MARKER}\ndone`;
    expect(extractCartSource(text)).toBe(GOOD);
  });

  it("uses the last marker block when the agent printed several", () => {
    const text = `${CART_BEGIN_MARKER}\nold\n${CART_END_MARKER}\n${CART_BEGIN_MARKER}\n${GOOD}\n${CART_END_MARKER}`;
    expect(extractCartSource(text)).toBe(GOOD);
  });

  it("falls back to a fenced block that exports create", () => {
    expect(extractCartSource("here\n```js\n" + GOOD + "\n```")).toBe(GOOD);
  });

  it("ignores fenced blocks that are not cartridges", () => {
    expect(extractCartSource("```js\nconsole.log(1)\n```")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractCartSource("")).toBeNull();
  });
});

describe("validateCartSource", () => {
  it("accepts a well-formed cartridge", () => {
    expect(validateCartSource(GOOD).ok).toBe(true);
  });

  it("rejects empty and create-less sources", () => {
    expect(validateCartSource("").ok).toBe(false);
    expect(validateCartSource("const x = 1;").ok).toBe(false);
  });

  it.each([
    ["Math.random()", "Math.random"],
    ["document.body", "document"],
    ["window.alert(1)", "window"],
    ["fetch('/x')", "fetch"],
    ["eval('1')", "eval"],
    ["setTimeout(f, 1)", "setTimeout"],
    ["new Date()", "Date"],
  ])("rejects forbidden token %s", (snippet, token) => {
    const res = validateCartSource(`${GOOD}\nconst z = ${snippet};`);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain(token);
  });

  it("rejects cartridges that are too long", () => {
    const long = GOOD + "\n".repeat(500);
    expect(validateCartSource(long).ok).toBe(false);
  });
});

describe("describeFallbackReason", () => {
  it("maps timeouts and rate limits to the wording App.tsx matches on", () => {
    expect(describeFallbackReason(new Error("run exceeded 240000ms: timeout"))).toMatch(/timeout|took too long/);
    expect(describeFallbackReason(new Error("HTTP 429"))).toMatch(/429|rate|packed/);
  });

  it("truncates unknown errors", () => {
    expect(describeFallbackReason(new Error("x".repeat(500))).length).toBeLessThanOrEqual(200);
  });
});
