import { HowLongToBeatService } from "howlongtobeat";
import type { HltbEntry } from "../types.js";

export async function getHltbDataHandler(title: string): Promise<HltbEntry> {
  const service = new HowLongToBeatService();
  const results = await service.search(title);

  if (!results || results.length === 0) {
    return { title, main_hours: null, extra_hours: null, completionist_hours: null };
  }

  const entry = results[0];
  return {
    title: entry.name ?? title,
    main_hours: entry.gameplayMain > 0 ? entry.gameplayMain : null,
    extra_hours: entry.gameplayMainExtra > 0 ? entry.gameplayMainExtra : null,
    completionist_hours: entry.gameplayCompletionist > 0 ? entry.gameplayCompletionist : null,
  };
}
