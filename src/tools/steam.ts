import { fetchSteamLibrary } from "../lib/steam-api.js";
import { readProfile, writeProfile } from "./profile.js";
import type { SteamGame } from "../types.js";

export async function getSteamLibraryHandler(refresh: boolean): Promise<SteamGame[]> {
  const profile = readProfile();

  if (!refresh && profile.library_cache.steam.length > 0) {
    return profile.library_cache.steam;
  }

  const games = await fetchSteamLibrary();
  profile.library_cache.steam = games;
  profile.library_cache.last_updated = new Date().toISOString();
  writeProfile(profile);
  return games;
}
