import axios from "axios";
import type { OpenCriticResult } from "../types.js";

const BASE = "https://api.opencritic.com/api";

const TIERS: Record<string, string> = {
  Mighty: "Mighty",
  Strong: "Strong",
  Fair: "Fair",
  Weak: "Weak",
};

export async function getCriticScoreHandler(title: string): Promise<OpenCriticResult> {
  const searchRes = await axios.get(`${BASE}/game/search`, {
    params: { criteria: title },
    headers: { "User-Agent": "gaming-assistant-mcp/1.0" },
  });

  const results: Array<{ id: number; name: string }> = searchRes.data;
  if (!results || results.length === 0) {
    return { title, found: false, score: null, tier: null, review_count: null, url: null };
  }

  const best = results[0];
  const gameRes = await axios.get(`${BASE}/game/${best.id}`, {
    headers: { "User-Agent": "gaming-assistant-mcp/1.0" },
  });

  const g = gameRes.data;
  const tier = g.tier ? (TIERS[g.tier] ?? g.tier) : null;

  return {
    title: g.name ?? best.name,
    found: true,
    score: typeof g.topCriticScore === "number" ? Math.round(g.topCriticScore) : null,
    tier,
    review_count: typeof g.numReviews === "number" ? g.numReviews : null,
    url: `https://opencritic.com/game/${best.id}/${best.name.toLowerCase().replace(/\s+/g, "-")}`,
  };
}
