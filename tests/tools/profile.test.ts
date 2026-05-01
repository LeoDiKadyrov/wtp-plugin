import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

vi.mock("fs");

const { readProfile, writeProfile } = await import("../../src/tools/profile.js");

const DEFAULT_PROFILE = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env.PROFILE_PATH = "/fake/gaming_profile.json";
});

describe("readProfile", () => {
  it("returns default profile when file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(readProfile()).toEqual(DEFAULT_PROFILE);
  });

  it("parses and returns existing profile", () => {
    const stored = { ...DEFAULT_PROFILE, preferences: { ...DEFAULT_PROFILE.preferences, favorite_genres: ["RPG"] } };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(stored) as any);
    expect(readProfile().preferences.favorite_genres).toContain("RPG");
  });
});

describe("writeProfile", () => {
  it("writes serialized profile to disk", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_PROFILE) as any);
    writeProfile({ preferences: { ...DEFAULT_PROFILE.preferences, favorite_genres: ["Action"] }, interview_history: [], library_cache: DEFAULT_PROFILE.library_cache });
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
      "/fake/gaming_profile.json",
      expect.stringContaining("Action"),
      "utf-8"
    );
  });
});
