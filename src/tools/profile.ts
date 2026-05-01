import * as fs from "fs";
import * as path from "path";
import type { GamingProfile } from "../types.js";

const DEFAULT_PROFILE: GamingProfile = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

function profilePath(): string {
  return process.env.PROFILE_PATH ?? path.join(process.cwd(), "gaming_profile.json");
}

export function readProfile(): GamingProfile {
  const p = profilePath();
  if (!fs.existsSync(p)) return structuredClone(DEFAULT_PROFILE);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as GamingProfile;
}

export function writeProfile(data: GamingProfile): void {
  fs.writeFileSync(profilePath(), JSON.stringify(data, null, 2), "utf-8");
}

export async function manageProfileHandler(
  action: "read" | "write",
  data?: object
): Promise<GamingProfile> {
  if (action === "read") return readProfile();
  const updated = data as GamingProfile;
  writeProfile(updated);
  return updated;
}
