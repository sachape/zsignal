import { describe, expect, it } from "vitest";
import { matchesKeyword } from "./voiceKeyword";

describe("matchesKeyword", () => {
  it("matches the isolated keyword", () => {
    expect(matchesKeyword("clip", "clip")).toBe(true);
    expect(matchesKeyword("allez hop, clip !", "clip")).toBe(true);
    expect(matchesKeyword("ce clip est incroyable", "clip")).toBe(true);
  });

  it("ignores derived words", () => {
    expect(matchesKeyword("clipping", "clip")).toBe(false);
    expect(matchesKeyword("clips", "clip")).toBe(false);
    expect(matchesKeyword("clippé", "clip")).toBe(false);
    expect(matchesKeyword("je vais regarder des clips", "clip")).toBe(false);
  });

  it("handles accents and empty input", () => {
    expect(matchesKeyword("SAUVEGARDE", "sauvegarde")).toBe(true);
    expect(matchesKeyword("moment", "")).toBe(false);
  });
});
