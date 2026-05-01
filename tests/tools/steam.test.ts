import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/lib/steam-api.js", () => ({
  fetchSteamLibrary: vi.fn(),
}));
vi.mock("../../src/tools/profile.js", () => ({
  readProfile: vi.fn(),
  writeProfile: vi.fn(),
}));

import { fetchSteamLibrary } from "../../src/lib/steam-api.js";
import { readProfile, writeProfile } from "../../src/tools/profile.js";
import { getSteamLibraryHandler } from "../../src/tools/steam.js";

const baseProfile = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

describe("getSteamLibraryHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches from API when refresh=true and caches result", async () => {
    const games = [{ appid: 730, name: "CS2", playtime_forever: 100, img_icon_url: "" }];
    vi.mocked(fetchSteamLibrary).mockResolvedValue(games);
    vi.mocked(readProfile).mockReturnValue({ ...baseProfile });

    const result = await getSteamLibraryHandler(true);

    expect(fetchSteamLibrary).toHaveBeenCalledOnce();
    expect(writeProfile).toHaveBeenCalledOnce();
    expect(result).toEqual(games);
  });

  it("returns cache when refresh=false and cache is non-empty", async () => {
    const cached = [{ appid: 440, name: "TF2", playtime_forever: 500, img_icon_url: "" }];
    vi.mocked(readProfile).mockReturnValue({
      ...baseProfile,
      library_cache: { steam: cached, local: [], last_updated: "2026-04-30" },
    });

    const result = await getSteamLibraryHandler(false);

    expect(fetchSteamLibrary).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
