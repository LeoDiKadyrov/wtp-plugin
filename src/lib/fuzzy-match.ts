import axios from "axios";
import Fuse from "fuse.js";

export async function normalizeGameName(rawName: string): Promise<string> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return rawName;

  try {
    const { data } = await axios.get("https://store.steampowered.com/api/storesearch/", {
      params: { term: rawName, l: "english", cc: "US" },
    });
    const candidates: string[] = (data.items ?? []).map((r: { name: string }) => r.name);
    if (candidates.length === 0) return rawName;
    if (candidates.length === 1) return candidates[0];

    let bestMatch = candidates[0];
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      let score = 0;
      const lowerCand = candidate.toLowerCase();
      const lowerRaw = rawName.toLowerCase();

      let matchLen = 0;
      for (const char of lowerRaw) {
        if (lowerCand.includes(char)) matchLen++;
      }
      score += matchLen * 10;

      if (lowerCand.includes(lowerRaw)) score += 100;

      const fuse = new Fuse([candidate], { threshold: 0.8 });
      if (fuse.search(rawName).length > 0) score += 50;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  } catch {
    return rawName;
  }
}
