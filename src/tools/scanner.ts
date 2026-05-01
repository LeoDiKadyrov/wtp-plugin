import { glob } from "glob";
import * as fs from "fs";
import * as nodePath from "path";
import { parseAcf } from "../lib/acf-parser.js";
import { readPEVersionInfo } from "../lib/pe-reader.js";
import { normalizeGameName } from "../lib/fuzzy-match.js";
import { readProfile, writeProfile } from "./profile.js";
import type { LocalGame } from "../types.js";

export async function scanLocalGamesHandler(paths: string[]): Promise<LocalGame[]> {
  const found: LocalGame[] = [];

  for (const scanPath of paths) {
    // 1. Steam .acf manifests
    const acfFiles = await glob(`${scanPath}/**/*.acf`);
    for (const acfFile of acfFiles) {
      const content = fs.readFileSync(acfFile, "utf-8");
      const { name } = parseAcf(content);
      if (!name) continue;
      const canonical = await normalizeGameName(name);
      found.push({ name: canonical, rawName: name, path: acfFile, source: "steam_manifest" });
    }

    // 2. Epic Games .egstore manifests
    const epicFiles = await glob(`${scanPath}/**/*.egstore`);
    for (const epicFile of epicFiles) {
      const rawName = nodePath.basename(nodePath.dirname(epicFile));
      const canonical = await normalizeGameName(rawName);
      found.push({ name: canonical, rawName, path: epicFile, source: "epic_manifest" });
    }

    // 3. Fallback: .exe PE headers
    const exeFiles = await glob(`${scanPath}/**/*.exe`, { ignore: ["**/Redist/**", "**/vcredist*"] });
    for (const exeFile of exeFiles) {
      const { productName } = readPEVersionInfo(exeFile);
      if (!productName) continue;
      // Skip if already found via manifest
      if (found.some((g) => g.path === exeFile || g.rawName === productName)) continue;
      const canonical = await normalizeGameName(productName);
      found.push({ name: canonical, rawName: productName, path: exeFile, source: "pe_header" });
    }
  }

  // Deduplicate by canonical name
  const unique = Array.from(new Map(found.map((g) => [g.name, g])).values());

  // Cache result in profile
  const profile = readProfile();
  profile.library_cache.local = unique;
  profile.library_cache.last_updated = new Date().toISOString();
  writeProfile(profile);

  return unique;
}
