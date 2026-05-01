import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/tools/profile.js", () => ({ readProfile: vi.fn() }));

import { readProfile } from "../../src/tools/profile.js";
import { startSessionHandler } from "../../src/tools/session.js";

const emptyProfile = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

beforeEach(() => vi.resetAllMocks());

describe("startSessionHandler", () => {
  it("returns onboarding phase with baseline questions on first run", () => {
    vi.mocked(readProfile).mockReturnValue(structuredClone(emptyProfile));

    const state = startSessionHandler();

    expect(state.phase).toBe("onboarding");
    expect(state.profile_complete).toBe(false);
    expect(state.interview_done).toBe(false);
    expect(state.interview_questions).not.toBeNull();
    expect(state.interview_questions!.length).toBeGreaterThan(0);
    expect(state.next_steps.some((s) => s.action === "baseline_interview")).toBe(true);
    expect(state.next_steps.some((s) => s.tool === "get_steam_library")).toBe(true);
  });

  it("returns returning phase when profile is complete and fresh", () => {
    const recentDate = new Date(Date.now() - 5 * 86_400_000).toISOString();
    vi.mocked(readProfile).mockReturnValue({
      preferences: { favorite_genres: ["RPG"], favorite_mechanics: ["exploration"], vibe_tags: ["atmospheric"], disliked_genres: [] },
      interview_history: [{ date: recentDate, type: "baseline", summary: "Loves RPGs" }],
      library_cache: { steam: [{ appid: 730, name: "CS2", playtime_forever: 100, img_icon_url: "" }], local: [], last_updated: recentDate },
    });

    const state = startSessionHandler();

    expect(state.phase).toBe("returning");
    expect(state.profile_complete).toBe(true);
    expect(state.interview_done).toBe(true);
    expect(state.interview_questions).toBeNull();
    expect(state.days_since_last_interview).toBeLessThan(30);
  });

  it("includes micro_interview step when profile is stale (>30 days)", () => {
    const staleDate = new Date(Date.now() - 45 * 86_400_000).toISOString();
    vi.mocked(readProfile).mockReturnValue({
      preferences: { favorite_genres: ["RPG"], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
      interview_history: [{ date: staleDate, type: "baseline", summary: "Old summary" }],
      library_cache: { steam: [], local: [], last_updated: null },
    });

    const state = startSessionHandler();

    expect(state.days_since_last_interview).toBeGreaterThanOrEqual(30);
    expect(state.next_steps.some((s) => s.action === "micro_interview")).toBe(true);
    expect(state.interview_questions).not.toBeNull();
  });

  it("skips load_steam_library step when cache already populated", () => {
    vi.mocked(readProfile).mockReturnValue({
      ...emptyProfile,
      library_cache: { steam: [{ appid: 1, name: "Game", playtime_forever: 0, img_icon_url: "" }], local: [], last_updated: new Date().toISOString() },
    });

    const state = startSessionHandler();
    expect(state.next_steps.some((s) => s.tool === "get_steam_library" && (s.params as any)?.refresh === true)).toBe(false);
  });
});
