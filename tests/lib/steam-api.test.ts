import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

const { fetchSteamLibrary } = await import("../../src/lib/steam-api.js");

beforeEach(() => {
  process.env.STEAM_API_KEY = "test_key";
  process.env.STEAM_ID = "76561198000000000";
});

describe("fetchSteamLibrary", () => {
  it("returns array of games from Steam API response", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        response: {
          games: [
            { appid: 730, name: "Counter-Strike 2", playtime_forever: 1200, img_icon_url: "abc" }
          ]
        }
      }
    });

    const games = await fetchSteamLibrary();
    expect(games).toHaveLength(1);
    expect(games[0].name).toBe("Counter-Strike 2");
    expect(games[0].playtime_forever).toBe(1200);
  });

  it("returns empty array when Steam API returns no games", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { response: {} } });
    expect(await fetchSteamLibrary()).toEqual([]);
  });
});
