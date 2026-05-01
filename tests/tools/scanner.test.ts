import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";

vi.mock("fs");
vi.mock("glob", () => ({ glob: vi.fn() }));
vi.mock("../../src/lib/acf-parser.js", () => ({ parseAcf: vi.fn() }));
vi.mock("../../src/lib/pe-reader.js", () => ({ readPEVersionInfo: vi.fn() }));
vi.mock("../../src/lib/fuzzy-match.js", () => ({ normalizeGameName: vi.fn() }));
vi.mock("../../src/tools/profile.js", () => ({ readProfile: vi.fn(), writeProfile: vi.fn() }));

import { glob } from "glob";
import { parseAcf } from "../../src/lib/acf-parser.js";
import { readPEVersionInfo } from "../../src/lib/pe-reader.js";
import { normalizeGameName } from "../../src/lib/fuzzy-match.js";
import { readProfile, writeProfile } from "../../src/tools/profile.js";
import { scanLocalGamesHandler } from "../../src/tools/scanner.js";

const baseProfile = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

describe("scanLocalGamesHandler", () => {
  it("finds games from .acf manifests and normalizes names", async () => {
    vi.mocked(glob)
      .mockResolvedValueOnce(["C:/Steam/steamapps/appmanifest_730.acf"]) // .acf files
      .mockResolvedValueOnce([]) // .egstore
      .mockResolvedValueOnce([]); // .exe files
    vi.mocked(fs.readFileSync).mockReturnValue("acf content" as any);
    vi.mocked(parseAcf).mockReturnValue({ appid: "730", name: "cs2" });
    vi.mocked(normalizeGameName).mockResolvedValue("Counter-Strike 2");
    vi.mocked(readProfile).mockReturnValue({ ...baseProfile });

    const result = await scanLocalGamesHandler(["C:/Steam/steamapps"]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Counter-Strike 2");
    expect(result[0].source).toBe("steam_manifest");
  });
});
