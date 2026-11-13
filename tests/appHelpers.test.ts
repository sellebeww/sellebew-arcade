import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STAGE_CAPTIONS,
  applyCartKeyInput,
  fillHeroSlot,
  getInitialUrlState,
} from "../src/app/appHelpers";
import { buildPresetCard } from "../src/card/designCard";
import type { CartInputState } from "../src/cart/CartHost";

const card = buildPresetCard({ name: "tester", genre: "runner", hero: "a fox", vibe: "sunset" });

function blankInput(): CartInputState {
  return { left: false, right: false, up: false, down: false, a: false, b: false, start: false } as CartInputState;
}

afterEach(() => vi.unstubAllGlobals());

describe("fillHeroSlot", () => {
  it("fills {hero} from the card", () => {
    expect(fillHeroSlot("sketching your {hero}…", card)).toBe(`sketching your ${card.hero.short}…`);
  });

  it("falls back to the raw hero text without a card", () => {
    expect(fillHeroSlot("{hero}!", null, "a very small dragon")).toContain("!");
    expect(fillHeroSlot("{hero}!", null, "a very small dragon")).not.toContain("{hero}");
  });

  it("replaces every occurrence", () => {
    const out = fillHeroSlot("{hero} and {hero}", card);
    expect(out.split(card.hero.short).length - 1).toBe(2);
  });
});

describe("STAGE_CAPTIONS", () => {
  it("has at least one caption per stage", () => {
    for (const pool of Object.values(STAGE_CAPTIONS)) expect(pool.length).toBeGreaterThan(0);
  });
});

describe("getInitialUrlState", () => {
  function at(search: string) {
    vi.stubGlobal("window", { location: { search } });
    return getInitialUrlState();
  }

  it("defaults to the name step", () => {
    expect(at("")).toEqual({ mode: "create", createStep: "name", explicitStateParam: false });
  });

  it("reads state and numeric or named question steps", () => {
    expect(at("?state=build")).toMatchObject({ mode: "build", explicitStateParam: true });
    expect(at("?state=create&q=3").createStep).toBe("hero");
    expect(at("?state=create&q=vibe").createStep).toBe("vibe");
  });

  it("defaults ?state=create to the hero step", () => {
    expect(at("?state=create").createStep).toBe("hero");
  });

  it("ignores unknown state values", () => {
    expect(at("?state=nope").mode).toBe("create");
  });

  it("is safe without a window (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(getInitialUrlState().mode).toBe("create");
  });
});

describe("applyCartKeyInput", () => {
  it.each([
    ["arrowleft", "left"], ["a", "left"],
    ["arrowright", "right"], ["d", "right"],
    ["arrowup", "up"], ["w", "up"],
    ["arrowdown", "down"], ["s", "down"],
    ["z", "a"], ["j", "a"], [" ", "a"],
    ["x", "b"], ["k", "b"],
    ["enter", "start"],
  ] as const)("maps %s to %s", (key, field) => {
    const input = blankInput();
    expect(applyCartKeyInput(input, key, true)).toBe(true);
    expect(input[field]).toBe(true);
    expect(applyCartKeyInput(input, key, false)).toBe(true);
    expect(input[field]).toBe(false);
  });

  it("leaves unmapped keys alone", () => {
    const input = blankInput();
    expect(applyCartKeyInput(input, "q", true)).toBe(false);
    expect(Object.values(input).some(Boolean)).toBe(false);
  });
});
