import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GENRE_LIST } from "../src/card/presets";
import { buildPresetCard } from "../src/card/designCard";

const root = path.resolve(__dirname, "..");
const tmp = mkdtempSync(path.join(tmpdir(), "arcade-engine-"));

function verify(cartPath: string, genre: (typeof GENRE_LIST)[number]): string {
  const card = buildPresetCard({ name: "tester", genre, hero: "a fox", vibe: "sunset" });
  const cardPath = path.join(tmp, `${genre}.json`);
  writeFileSync(cardPath, JSON.stringify(card));
  return execFileSync("node", ["engine/headless.mjs", cartPath, cardPath], {
    cwd: root,
    encoding: "utf8",
  });
}

describe("house games pass the headless verifier", () => {
  for (const genre of GENRE_LIST) {
    it(genre, () => {
      const out = verify(path.join("engine", "games", `${genre}.js`), genre);
      expect(out).toContain("PASS");
    }, 60_000);
  }
});

describe("public/house-games stays in sync with engine/games", () => {
  for (const genre of GENRE_LIST) {
    it(genre, () => {
      const a = readFileSync(path.join(root, "engine", "games", `${genre}.js`), "utf8");
      const b = readFileSync(path.join(root, "public", "house-games", `${genre}.js`), "utf8");
      expect(b).toBe(a);
    });
  }
});
