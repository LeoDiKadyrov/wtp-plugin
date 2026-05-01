import { describe, it, expect, vi } from "vitest";

vi.mock("howlongtobeat", () => ({
  HowLongToBeatService: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
  })),
}));

import { HowLongToBeatService } from "howlongtobeat";
import { getHltbDataHandler } from "../../src/tools/hltb.js";

describe("getHltbDataHandler", () => {
  it("returns HLTB times for a known game", async () => {
    const mockSearch = vi.fn().mockResolvedValue([{ name: "Hollow Knight", gameplayMain: 25, gameplayMainExtra: 40, gameplayCompletionist: 60 }]);
    vi.mocked(HowLongToBeatService).mockImplementation(() => ({ search: mockSearch }) as any);

    const result = await getHltbDataHandler("Hollow Knight");
    expect(result.title).toBe("Hollow Knight");
    expect(result.main_hours).toBe(25);
    expect(result.extra_hours).toBe(40);
    expect(result.completionist_hours).toBe(60);
  });

  it("returns null hours when game is not found", async () => {
    const mockSearch = vi.fn().mockResolvedValue([]);
    vi.mocked(HowLongToBeatService).mockImplementation(() => ({ search: mockSearch }) as any);

    const result = await getHltbDataHandler("NonExistentGame123");
    expect(result.title).toBe("NonExistentGame123");
    expect(result.main_hours).toBeNull();
  });
});
