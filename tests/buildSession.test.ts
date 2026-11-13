import { beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn();
const cancel = vi.fn(async () => ({}));
const readText = vi.fn();

vi.mock("../src/gemini", () => ({
  ma: {
    run: (...a: unknown[]) => run(...a),
    interactions: { cancel: (...a: unknown[]) => cancel(...a), delete: vi.fn(async () => ({})) },
    environments: { delete: vi.fn(async () => ({})) },
    files: { readText: (...a: unknown[]) => readText(...a) },
  },
  image: vi.fn(),
}));

import { BuildSession, loadHouseGameSource } from "../src/build/buildSession";
import { CART_BEGIN_MARKER, CART_END_MARKER } from "../src/build/cartSource";
import { buildPresetCard } from "../src/card/designCard";

const GOOD = `export function create(engine, card) {\n  return { update() {}, draw() {} };\n}`;
const card = buildPresetCard({ name: "tester", genre: "runner", hero: "a fox", vibe: "sunset" });

function ok(text: string) {
  return { ok: true, status: "completed", id: "int_1", environmentId: "env_1", totalTokens: 123, text, steps: [] };
}

beforeEach(() => {
  run.mockReset();
  cancel.mockClear();
  readText.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, text: async () => "HOUSE" })));
});

describe("loadHouseGameSource", () => {
  it("fetches and caches per genre", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, text: async () => "SRC" }));
    vi.stubGlobal("fetch", f);
    expect(await loadHouseGameSource("maze")).toBe("SRC");
    expect(await loadHouseGameSource("maze")).toBe("SRC");
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toContain("house-games/maze.js");
  });

  it("does not cache failures", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "" })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => "OK" });
    vi.stubGlobal("fetch", f);
    await expect(loadHouseGameSource("breakout")).rejects.toThrow(/404/);
    expect(await loadHouseGameSource("breakout")).toBe("OK");
  });
});

describe("BuildSession", () => {
  it("returns the verified cartridge on a good live build", async () => {
    run.mockResolvedValueOnce(ok(`${CART_BEGIN_MARKER}\n${GOOD}\n${CART_END_MARKER}`));
    const states: string[] = [];
    const session = new BuildSession(card, { onUpdate: (s) => states.push(s.state) });
    const snap = await session.start({ timeoutMs: 5000 });
    expect(snap.state).toBe("READY");
    expect(snap.isFallback).toBe(false);
    expect(snap.cartSource).toBe(GOOD);
    expect(snap.tokens).toBe(123);
    expect(session.interactionId).toBe("int_1");
    expect(session.environmentId).toBe("env_1");
    expect(states).toContain("VERIFYING");
  });

  it("reads the cartridge from the sandbox when the reply has none", async () => {
    run.mockResolvedValueOnce(ok("done"));
    readText.mockResolvedValueOnce(GOOD);
    const snap = await new BuildSession(card).start({ timeoutMs: 5000 });
    expect(snap.state).toBe("READY");
    expect(readText).toHaveBeenCalledWith("env_1", "/workspace/out/game.js");
  });

  it("retries once, then succeeds", async () => {
    run.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(ok(`\`\`\`js\n${GOOD}\n\`\`\``));
    const states: string[] = [];
    const snap = await new BuildSession(card, { onUpdate: (s) => states.push(s.state) }).start({ timeoutMs: 5000 });
    expect(run).toHaveBeenCalledTimes(2);
    expect(states).toContain("RETRYING");
    expect(snap.state).toBe("READY");
  });

  it("falls back to the house game after repeated failures", async () => {
    run.mockRejectedValue(new Error("HTTP 429 too many requests"));
    const snap = await new BuildSession(card).start({ timeoutMs: 5000 });
    expect(snap.state).toBe("FALLBACK");
    expect(snap.isFallback).toBe(true);
    expect(snap.houseCartSource).toBe("HOUSE");
    expect(snap.fallbackReason?.toLowerCase()).toContain("429");
  });

  it("rejects an unsafe cartridge and falls back", async () => {
    run.mockResolvedValue(ok(`${CART_BEGIN_MARKER}\n${GOOD}\nMath.random();\n${CART_END_MARKER}`));
    const snap = await new BuildSession(card).start({ timeoutMs: 5000 });
    expect(snap.isFallback).toBe(true);
    expect(snap.cartSource).toBeUndefined();
  });

  it("falls back immediately when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const snap = await new BuildSession(card).start({ timeoutMs: 5000 });
    expect(run).not.toHaveBeenCalled();
    expect(snap.isFallback).toBe(true);
    vi.unstubAllGlobals();
  });

  it("cancels cleanly and reports CANCELLED", async () => {
    let reject!: (e: Error) => void;
    run.mockImplementationOnce(() => new Promise((_, r) => (reject = r)));
    const session = new BuildSession(card);
    const started = session.start({ timeoutMs: 5000 });
    await new Promise((r) => setTimeout(r, 10));
    session.interactionId = "int_9";
    await session.cancel();
    reject(new Error("aborted"));
    const snap = await started;
    expect(snap.state).toBe("CANCELLED");
    expect(cancel).toHaveBeenCalledWith("int_9");
  });

  it("refuses to start twice", async () => {
    run.mockResolvedValue(ok(GOOD));
    const s = new BuildSession(card);
    await s.start({ timeoutMs: 5000 });
    await expect(s.start()).rejects.toThrow(/already started/);
  });
});
