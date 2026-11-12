// Pure data and helpers for the arcade UI, split out of App.tsx so they can be unit-tested.
import type { BuildStageName } from "../stage/attract";
import type { CartInputState } from "../cart/CartHost";
import type { GameDesignCard } from "../card/schema";
import { deriveShortHero } from "../card/designCard";

export type AppMode = "create" | "build" | "play" | "switch";
export type CreateStep = "name" | "genre" | "hero" | "vibe" | "ready";

export const HERO_PLACEHOLDERS: readonly string[] = [
  "a fox in a tiny scarf",
  "your boss, but a pigeon",
  "a sandwich with dreams",
  "grandma in a jetpack",
];

export const STAGE_CAPTIONS: Record<BuildStageName, readonly string[]> = {
  designing: [
    "sketching your {hero}…",
    "naming things. naming is hard.",
  ],
  coding: [
    "teaching your {hero} to move.",
    "writing the rules. no cheating.",
    "adding bad guys. sorry.",
  ],
  playtesting: [
    "playtesting. your {hero} died twice. fixing.",
    "making it fair-ish.",
  ],
  testing: [
    "playtesting. your {hero} died twice. fixing.",
    "making it fair-ish.",
  ],
  finishing: ["polishing the pixels."],
  painting: ["painting the sides now."],
  ready: ["it's alive. go go go."],
};

export const LATE_BUILD_CAPTIONS: readonly string[] = [
  "taking its time. good games do.",
  "almost. probably. definitely almost.",
];

export function fillHeroSlot(template: string, card?: GameDesignCard | null, rawHero?: string): string {
  const shortHero =
    card?.hero?.short ||
    deriveShortHero(rawHero || "", "fox", 18);
  return template.replace(/\{hero\}/g, shortHero);
}

export function getInitialUrlState(): {
  mode: AppMode;
  createStep: CreateStep;
  explicitStateParam: boolean;
} {
  if (typeof window === "undefined") {
    return {
      mode: "create",
      createStep: "name",
      explicitStateParam: false,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const rawState = params.get("state");
  const rawQ = params.get("q");
  const explicitStateParam = params.has("state");

  const mode: AppMode =
    rawState === "build" || rawState === "play" || rawState === "switch" || rawState === "create"
      ? rawState
      : "create";

  let createStep: CreateStep = "name";
  if (rawQ === "name" || rawQ === "1") createStep = "name";
  else if (rawQ === "genre" || rawQ === "2") createStep = "genre";
  else if (rawQ === "hero" || rawQ === "3") createStep = "hero";
  else if (rawQ === "vibe" || rawQ === "4") createStep = "vibe";
  else if (rawQ === "ready" || rawQ === "5") createStep = "ready";
  else if (rawState === "create" && !rawQ) {
    // Match mocks/playglow/index.html?state=create which defaults to the hero step
    createStep = "hero";
  }

  return { mode, createStep, explicitStateParam };
}

export function applyCartKeyInput(
  input: CartInputState,
  lowerKey: string,
  pressed: boolean
): boolean {
  if (lowerKey === "arrowleft" || lowerKey === "a") {
    input.left = pressed;
    return true;
  }
  if (lowerKey === "arrowright" || lowerKey === "d") {
    input.right = pressed;
    return true;
  }
  if (lowerKey === "arrowup" || lowerKey === "w") {
    input.up = pressed;
    return true;
  }
  if (lowerKey === "arrowdown" || lowerKey === "s") {
    input.down = pressed;
    return true;
  }
  if (lowerKey === "z" || lowerKey === "j" || lowerKey === " ") {
    input.a = pressed;
    return true;
  }
  if (lowerKey === "x" || lowerKey === "k") {
    input.b = pressed;
    return true;
  }
  if (lowerKey === "enter") {
    input.start = pressed;
    return true;
  }
  return false;
}
