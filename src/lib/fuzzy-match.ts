import axios from "axios";
import Fuse from "fuse.js";

export async function normalizeGameName(rawName: string): Promise<string> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return rawName;

  try {
    const { data } = await axios.get("https://api.rawg.io/api/games", {
      params: { key, search: rawName, page_size: 5 },
    });
    const candidates: string[] = (data.results ?? []).map((r: { name: string }) => r.name);
    if (candidates.length === 0) return rawName;
    if (candidates.length === 1) return candidates[0];

    // Custom scoring: find the best match by checking substring presence
    // and weighting exact character matches
    let bestMatch = candidates[0];
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      let score = 0;
      const lowerCand = candidate.toLowerCase();
      const lowerRaw = rawName.toLowerCase();

      // Check for consecutive character matches
      let matchLen = 0;
      for (const char of lowerRaw) {
        if (lowerCand.includes(char)) {
          matchLen++;
        }
      }
      score += matchLen * 10;

      // Bonus for substring matches
      if (lowerCand.includes(lowerRaw)) {
        score += 100;
      }

      // Use fuse for additional scoring
      const fuse = new Fuse([candidate], { threshold: 0.8 });
      const matches = fuse.search(rawName);
      if (matches.length > 0) {
        score += 50;
      }

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
