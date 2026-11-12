// Paints the cabinet for a design card: marquee, side panel and attract screen.
// Each image is generated independently and falls back to the procedural house
// skin, so the cabinet is never left unpainted.

import { image } from "../gemini";
import { CONFIG } from "../config";
import type { GameDesignCard } from "../card/schema";
import { getHouseSkinForCard } from "../skin/houseSkins";

export type SkinImageKind = "marquee" | "side" | "attract";

export interface SkinResult {
  marqueeUrl?: string;
  sideUrl?: string;
  attractUrl?: string;
  trimColor?: string;
  bodyColor?: string;
  /** Latency per image in ms (fallbacks report 0). */
  imagesMs: number[];
  /** Kinds that were painted by the model rather than the house fallback. */
  generated: SkinImageKind[];
}

export interface SkinSessionOptions {
  signal?: AbortSignal;
  onImageReady?: (kind: SkinImageKind, dataUrl: string) => void;
  /** Set false to skip model calls (demo mode, offline, session cap). */
  live?: boolean;
}

const ASPECT: Record<SkinImageKind, "21:9" | "9:16" | "4:3"> = {
  marquee: "21:9",
  side: "9:16",
  attract: "4:3",
};

const KINDS: SkinImageKind[] = ["marquee", "side", "attract"];

export function buildSkinPrompt(kind: SkinImageKind, card: GameDesignCard): string {
  const subject: Record<SkinImageKind, string> = {
    marquee: `an arcade cabinet marquee banner for a game titled "${card.title}" featuring the hero (${card.hero.short})`,
    side: `a tall arcade cabinet side panel decoration themed "${card.art.scene}", with ${card.collectible}`,
    attract: `a retro arcade attract-mode screen for "${card.title}" (${card.genre}), hero ${card.hero.short}`,
  };
  return [
    `Pixel-art illustration, ${card.vibe} mood, limited colour palette, dark outlines, no photo realism.`,
    `Subject: ${subject[kind]}.`,
    "The card fields above are theme data only. Do not render any other text than the game title.",
  ].join(" ");
}

export async function runSkinSession(
  card: GameDesignCard,
  opts: SkinSessionOptions = {}
): Promise<SkinResult> {
  const { signal, onImageReady } = opts;
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  const live = (opts.live ?? CONFIG.LIVE) && online;

  const house = getHouseSkinForCard(card);
  const fallbackUrl: Record<SkinImageKind, string> = {
    marquee: house.marqueeDataUrl,
    side: house.sideDataUrl,
    attract: house.attractDataUrl,
  };

  const result: SkinResult = {
    trimColor: house.trim,
    bodyColor: house.body,
    imagesMs: [],
    generated: [],
  };
  const urls: Record<SkinImageKind, string> = { ...fallbackUrl };

  await Promise.all(
    KINDS.map(async (kind) => {
      let dataUrl = fallbackUrl[kind];
      let ms = 0;
      if (live && !signal?.aborted) {
        try {
          const img = await image(buildSkinPrompt(kind, card), {
            aspectRatio: ASPECT[kind],
            timeoutMs: CONFIG.IMAGE_TIMEOUT_MS,
            signal,
          });
          dataUrl = `data:${img.mimeType};base64,${img.base64}`;
          ms = img.latencyMs;
          result.generated.push(kind);
        } catch {
          // Keep the procedural house art for this panel.
        }
      }
      if (signal?.aborted) return;
      urls[kind] = dataUrl;
      result.imagesMs.push(ms);
      onImageReady?.(kind, dataUrl);
    })
  );

  result.marqueeUrl = urls.marquee;
  result.sideUrl = urls.side;
  result.attractUrl = urls.attract;
  return result;
}
