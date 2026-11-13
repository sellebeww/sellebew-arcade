import { beforeEach, describe, expect, it, vi } from "vitest";

const image = vi.fn();
vi.mock("../src/gemini", () => ({ image: (...a: unknown[]) => image(...a), ma: {} }));
vi.mock("../src/skin/houseSkins", () => ({
  getHouseSkinForCard: () => ({
    marqueeDataUrl: "data:m",
    sideDataUrl: "data:s",
    attractDataUrl: "data:a",
    trim: "#fa0",
    body: "#422",
  }),
}));

import { buildSkinPrompt, runSkinSession } from "../src/build/skinSession";
import { buildPresetCard } from "../src/card/designCard";

const card = buildPresetCard({ name: "tester", genre: "runner", hero: "a fox", vibe: "sunset" });

beforeEach(() => {
  image.mockReset();
});

describe("runSkinSession", () => {
  it("uses generated images and reports latency", async () => {
    image.mockResolvedValue({ base64: "AAA", mimeType: "image/png", latencyMs: 40, model: "m" });
    const seen: string[] = [];
    const res = await runSkinSession(card, { live: true, onImageReady: (k) => seen.push(k) });
    expect(res.marqueeUrl).toBe("data:image/png;base64,AAA");
    expect(res.generated.sort()).toEqual(["attract", "marquee", "side"]);
    expect(seen.sort()).toEqual(["attract", "marquee", "side"]);
    expect(res.imagesMs).toEqual([40, 40, 40]);
  });

  it("falls back per panel when one image fails", async () => {
    image.mockImplementation(async (prompt: string) => {
      if (prompt.includes("side panel")) throw new Error("quota");
      return { base64: "BBB", mimeType: "image/png", latencyMs: 10, model: "m" };
    });
    const res = await runSkinSession(card, { live: true });
    expect(res.sideUrl).toBe("data:s");
    expect(res.marqueeUrl).toBe("data:image/png;base64,BBB");
    expect(res.generated).not.toContain("side");
  });

  it("makes no model calls when live is false", async () => {
    const res = await runSkinSession(card, { live: false });
    expect(image).not.toHaveBeenCalled();
    expect(res.marqueeUrl).toBe("data:m");
    expect(res.trimColor).toBe("#fa0");
  });

  it("does not paint after abort", async () => {
    const ctl = new AbortController();
    ctl.abort();
    const onImageReady = vi.fn();
    await runSkinSession(card, { live: true, signal: ctl.signal, onImageReady });
    expect(onImageReady).not.toHaveBeenCalled();
    expect(image).not.toHaveBeenCalled();
  });
});

describe("buildSkinPrompt", () => {
  it("is distinct per panel and marks card text as data", () => {
    const prompts = (["marquee", "side", "attract"] as const).map((k) => buildSkinPrompt(k, card));
    expect(new Set(prompts).size).toBe(3);
    prompts.forEach((p) => expect(p).toContain("theme data only"));
  });
});
