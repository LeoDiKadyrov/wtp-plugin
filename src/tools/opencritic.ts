import axios from "axios";
import type { OpenCriticResult } from "../types.js";

const BASE = "https://opencritic-api.p.rapidapi.com";

const TIERS: Record<string, string> = {
  Mighty: "Mighty",
  Strong: "Strong",
  Fair: "Fair",
  Weak: "Weak",
};

const rapidApiHeaders = {
  "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
  "x-rapidapi-host": "opencritic-api.p.rapidapi.com",
};

export async function getCriticScoreHandler(title: string): Promise<OpenCriticResult> {
  if (!process.env.RAPIDAPI_KEY) {
    return { title, found: false, score: null, tier: null, review_count: null, url: null };
  }

  const searchRes = await axios.get(`${BASE}/game/search`, {
    params: { criteria: title },
    headers: rapidApiHeaders,
  });

  const results: Array<{ id: number; name: string }> = searchRes.data;
  if (!results || results.length === 0) {
    return { title, found: false, score: null, tier: null, review_count: null, url: null };
  }

  const best = results[0];
  const gameRes = await axios.get(`${BASE}/game/${best.id}`, {
    headers: rapidApiHeaders,
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
