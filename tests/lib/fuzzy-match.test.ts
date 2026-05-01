import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

const { normalizeGameName } = await import("../../src/lib/fuzzy-match.js");

beforeEach(() => {
  process.env.STEAM_API_KEY = "test_key";
});

describe("normalizeGameName", () => {
  it("returns canonical Steam name for a close match", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { items: [{ name: "The Witcher 3: Wild Hunt" }, { name: "The Witcher 2" }] },
    });

    const result = await normalizeGameName("witcher3");
    expect(result).toBe("The Witcher 3: Wild Hunt");
  });

  it("returns original name when Steam returns no results", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { items: [] } });

    const result = await normalizeGameName("SomeObscureGame");
    expect(result).toBe("SomeObscureGame");
  });

  it("returns original name when Steam call fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

    const result = await normalizeGameName("CoolGame");
    expect(result).toBe("CoolGame");
  });
});
