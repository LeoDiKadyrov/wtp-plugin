import { describe, it, expect, vi } from "vitest";
import axios from "axios";

vi.mock("axios");

const { getCriticScoreHandler } = await import("../../src/tools/opencritic.js");

describe("getCriticScoreHandler", () => {
  it("returns score and tier for a found game", async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: [{ id: 1234, name: "Hollow Knight" }] })
      .mockResolvedValueOnce({ data: { name: "Hollow Knight", topCriticScore: 87.4, tier: "Mighty", numReviews: 42 } });

    const result = await getCriticScoreHandler("Hollow Knight");
    expect(result.found).toBe(true);
    expect(result.title).toBe("Hollow Knight");
    expect(result.score).toBe(87);
    expect(result.tier).toBe("Mighty");
    expect(result.review_count).toBe(42);
    expect(result.url).toContain("opencritic.com");
  });

  it("returns found=false when no search results", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: [] });

    const result = await getCriticScoreHandler("SomeUnknownGame999");
    expect(result.found).toBe(false);
    expect(result.score).toBeNull();
    expect(result.tier).toBeNull();
  });
});
