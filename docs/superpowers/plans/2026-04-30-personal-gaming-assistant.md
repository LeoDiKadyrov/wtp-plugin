# Personal Gaming Assistant MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server that gives Claude access to a user's Steam library, local game installations, Obsidian notes, and HowLongToBeat data for intelligent game recommendations.

**Architecture:** Data-Provider pattern — the server exposes 5 MCP tools that fetch and cache raw data; Claude performs all analysis and recommendation logic. State persists in a local `gaming_profile.json` file. Each tool module is an independently testable async function that index.ts wraps in the MCP protocol.

**Tech Stack:** TypeScript 5, Node.js 20+, `@modelcontextprotocol/sdk`, `axios`, `dotenv`, `fuse.js`, `glob`, `howlongtobeat`, `zod`, `vitest`

---

## File Map

| File | Responsibility |
|:---|:---|
| `src/index.ts` | MCP server entry point; registers all 5 tools |
| `src/types.ts` | Shared TypeScript interfaces |
| `src/tools/profile.ts` | `manage_profile` — read/write `gaming_profile.json` |
| `src/tools/steam.ts` | `get_steam_library` — Steam Web API integration |
| `src/tools/hltb.ts` | `get_hltb_data` — HowLongToBeat wrapper |
| `src/tools/reviews.ts` | `read_reviews` — Obsidian/Markdown reader |
| `src/tools/scanner.ts` | `scan_local_games` — deep local disk scanner |
| `src/lib/steam-api.ts` | Low-level Steam Web API HTTP client |
| `src/lib/acf-parser.ts` | Parse Steam `.acf` manifest files |
| `src/lib/pe-reader.ts` | Extract ProductName from Windows `.exe` via PowerShell |
| `src/lib/fuzzy-match.ts` | Normalize game names via RAWG API |
| `tests/tools/profile.test.ts` | Unit tests for manage_profile |
| `tests/tools/steam.test.ts` | Unit tests for get_steam_library |
| `tests/tools/hltb.test.ts` | Unit tests for get_hltb_data |
| `tests/tools/reviews.test.ts` | Unit tests for read_reviews |
| `tests/tools/scanner.test.ts` | Unit tests for scan_local_games |
| `tests/lib/acf-parser.test.ts` | Unit tests for ACF parser |
| `tests/lib/pe-reader.test.ts` | Unit tests for PE reader |
| `tests/lib/fuzzy-match.test.ts` | Unit tests for fuzzy matcher |
| `gaming_profile.json` | Runtime data file (gitignored) |
| `.env.example` | Template for required env vars |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript compiler config |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gaming-assistant-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "axios": "^1.7.0",
    "dotenv": "^16.4.0",
    "fuse.js": "^7.0.0",
    "glob": "^11.0.0",
    "howlongtobeat": "^2.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `.env.example`**

```dotenv
# Steam Web API key — get at https://steamcommunity.com/dev/apikey
STEAM_API_KEY=your_steam_api_key_here

# Your 64-bit Steam ID — find at https://steamid.io
STEAM_ID=76561198000000000

# RAWG API key (free) — get at https://rawg.io/apidocs
RAWG_API_KEY=your_rawg_api_key_here

# Absolute path where gaming_profile.json is stored
PROFILE_PATH=C:/Users/yourname/gaming_profile.json
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.env
gaming_profile.json
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected output: `added N packages` with no errors.

- [ ] **Step 6: Commit**

```bash
git init
git add package.json tsconfig.json .env.example .gitignore
git commit -m "chore: project scaffolding for gaming assistant MCP"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```typescript
export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // minutes
  img_icon_url: string;
}

export interface LocalGame {
  name: string;
  rawName: string;       // original name before normalization
  path: string;          // path to .exe
  source: "steam_manifest" | "epic_manifest" | "gog_manifest" | "pe_header";
}

export interface GamingProfile {
  preferences: {
    favorite_genres: string[];
    favorite_mechanics: string[];
    vibe_tags: string[];
    disliked_genres: string[];
  };
  interview_history: Array<{
    date: string;
    type: "baseline" | "micro";
    summary: string;
  }>;
  library_cache: {
    steam: SteamGame[];
    local: LocalGame[];
    last_updated: string | null;
  };
}

export interface HltbEntry {
  title: string;
  main_hours: number | null;
  extra_hours: number | null;
  completionist_hours: number | null;
}

export type ManageProfileAction = "read" | "write";
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: ACF Parser

**Files:**
- Create: `src/lib/acf-parser.ts`
- Create: `tests/lib/acf-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/acf-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseAcf } from "../../src/lib/acf-parser.js";

describe("parseAcf", () => {
  it("extracts appid and name from acf content", () => {
    const content = `"AppState"\n{\n\t"appid"\t\t"730"\n\t"name"\t\t"Counter-Strike 2"\n\t"StateFlags"\t\t"4"\n}`;
    const result = parseAcf(content);
    expect(result.appid).toBe("730");
    expect(result.name).toBe("Counter-Strike 2");
  });

  it("returns empty strings for missing keys", () => {
    const result = parseAcf(`"AppState"\n{\n}`);
    expect(result.appid).toBe("");
    expect(result.name).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/acf-parser.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/lib/acf-parser.ts`**

```typescript
export interface AcfData {
  appid: string;
  name: string;
}

export function parseAcf(content: string): AcfData {
  const get = (key: string): string => {
    const match = content.match(new RegExp(`"${key}"\\s+"([^"]+)"`));
    return match ? match[1] : "";
  };
  return { appid: get("appid"), name: get("name") };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/acf-parser.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/acf-parser.ts tests/lib/acf-parser.test.ts
git commit -m "feat: ACF manifest parser"
```

---

## Task 4: manage_profile Tool

**Files:**
- Create: `src/tools/profile.ts`
- Create: `tests/tools/profile.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/tools/profile.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

vi.mock("fs");

// Must import AFTER mocking fs
const { readProfile, writeProfile } = await import("../../src/tools/profile.js");

const DEFAULT_PROFILE = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env.PROFILE_PATH = "/fake/gaming_profile.json";
});

describe("readProfile", () => {
  it("returns default profile when file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(readProfile()).toEqual(DEFAULT_PROFILE);
  });

  it("parses and returns existing profile", () => {
    const stored = { ...DEFAULT_PROFILE, preferences: { ...DEFAULT_PROFILE.preferences, favorite_genres: ["RPG"] } };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(stored) as any);
    expect(readProfile().preferences.favorite_genres).toContain("RPG");
  });
});

describe("writeProfile", () => {
  it("writes serialized profile to disk", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_PROFILE) as any);
    writeProfile({ preferences: { ...DEFAULT_PROFILE.preferences, favorite_genres: ["Action"] }, interview_history: [], library_cache: DEFAULT_PROFILE.library_cache });
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
      "/fake/gaming_profile.json",
      expect.stringContaining("Action")
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tools/profile.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/tools/profile.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tools/profile.test.ts
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/tools/profile.ts tests/tools/profile.test.ts
git commit -m "feat: manage_profile tool (read/write gaming_profile.json)"
```

---

## Task 5: Steam API Client

**Files:**
- Create: `src/lib/steam-api.ts`
- Create: `tests/lib/steam-api.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/steam-api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

const { fetchSteamLibrary } = await import("../../src/lib/steam-api.js");

beforeEach(() => {
  process.env.STEAM_API_KEY = "test_key";
  process.env.STEAM_ID = "76561198000000000";
});

describe("fetchSteamLibrary", () => {
  it("returns array of games from Steam API response", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        response: {
          games: [
            { appid: 730, name: "Counter-Strike 2", playtime_forever: 1200, img_icon_url: "abc" }
          ]
        }
      }
    });

    const games = await fetchSteamLibrary();
    expect(games).toHaveLength(1);
    expect(games[0].name).toBe("Counter-Strike 2");
    expect(games[0].playtime_forever).toBe(1200);
  });

  it("returns empty array when Steam API returns no games", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { response: {} } });
    expect(await fetchSteamLibrary()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/steam-api.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/lib/steam-api.ts`**

```typescript
import axios from "axios";
import type { SteamGame } from "../types.js";

export async function fetchSteamLibrary(): Promise<SteamGame[]> {
  const key = process.env.STEAM_API_KEY;
  const steamid = process.env.STEAM_ID;
  if (!key || !steamid) throw new Error("STEAM_API_KEY and STEAM_ID must be set in .env");

  const { data } = await axios.get(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/",
    { params: { key, steamid, format: "json", include_appinfo: 1, include_played_free_games: 1 } }
  );
  return (data.response?.games ?? []) as SteamGame[];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/steam-api.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/steam-api.ts tests/lib/steam-api.test.ts
git commit -m "feat: Steam Web API client"
```

---

## Task 6: get_steam_library Tool

**Files:**
- Create: `src/tools/steam.ts`
- Create: `tests/tools/steam.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/tools/steam.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/steam-api.js", () => ({
  fetchSteamLibrary: vi.fn(),
}));
vi.mock("../../src/tools/profile.js", () => ({
  readProfile: vi.fn(),
  writeProfile: vi.fn(),
}));

import { fetchSteamLibrary } from "../../src/lib/steam-api.js";
import { readProfile, writeProfile } from "../../src/tools/profile.js";
import { getSteamLibraryHandler } from "../../src/tools/steam.js";

const baseProfile = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

describe("getSteamLibraryHandler", () => {
  it("fetches from API when refresh=true and caches result", async () => {
    const games = [{ appid: 730, name: "CS2", playtime_forever: 100, img_icon_url: "" }];
    vi.mocked(fetchSteamLibrary).mockResolvedValue(games);
    vi.mocked(readProfile).mockReturnValue({ ...baseProfile });

    const result = await getSteamLibraryHandler(true);

    expect(fetchSteamLibrary).toHaveBeenCalledOnce();
    expect(writeProfile).toHaveBeenCalledOnce();
    expect(result).toEqual(games);
  });

  it("returns cache when refresh=false and cache is non-empty", async () => {
    const cached = [{ appid: 440, name: "TF2", playtime_forever: 500, img_icon_url: "" }];
    vi.mocked(readProfile).mockReturnValue({
      ...baseProfile,
      library_cache: { steam: cached, local: [], last_updated: "2026-04-30" },
    });

    const result = await getSteamLibraryHandler(false);

    expect(fetchSteamLibrary).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tools/steam.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/tools/steam.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tools/steam.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/tools/steam.ts tests/tools/steam.test.ts
git commit -m "feat: get_steam_library tool with profile caching"
```

---

## Task 7: get_hltb_data Tool

**Files:**
- Create: `src/tools/hltb.ts`
- Create: `tests/tools/hltb.test.ts`

> **Note:** `howlongtobeat` scrapes the HLTB website. If the site changes its structure, the package may need updating.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/tools/hltb.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("howlongtobeat", () => ({
  HowLongToBeatService: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
  })),
}));

import { HowLongToBeatService } from "howlongtobeat";
import { getHltbDataHandler } from "../../src/tools/hltb.js";

describe("getHltbDataHandler", () => {
  it("returns HLTB times for a known game", async () => {
    const mockSearch = vi.fn().mockResolvedValue([{ name: "Hollow Knight", gameplayMain: 25, gameplayMainExtra: 40, gameplayCompletionist: 60 }]);
    vi.mocked(HowLongToBeatService).mockImplementation(() => ({ search: mockSearch }) as any);

    const result = await getHltbDataHandler("Hollow Knight");
    expect(result.title).toBe("Hollow Knight");
    expect(result.main_hours).toBe(25);
    expect(result.extra_hours).toBe(40);
    expect(result.completionist_hours).toBe(60);
  });

  it("returns null hours when game is not found", async () => {
    const mockSearch = vi.fn().mockResolvedValue([]);
    vi.mocked(HowLongToBeatService).mockImplementation(() => ({ search: mockSearch }) as any);

    const result = await getHltbDataHandler("NonExistentGame123");
    expect(result.title).toBe("NonExistentGame123");
    expect(result.main_hours).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tools/hltb.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/tools/hltb.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tools/hltb.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/tools/hltb.ts tests/tools/hltb.test.ts
git commit -m "feat: get_hltb_data tool (HowLongToBeat wrapper)"
```

---

## Task 8: read_reviews Tool

**Files:**
- Create: `src/tools/reviews.ts`
- Create: `tests/tools/reviews.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/tools/reviews.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("glob", () => ({ glob: vi.fn() }));
vi.mock("fs", () => ({ default: { readFileSync: vi.fn() }, readFileSync: vi.fn() }));

import { glob } from "glob";
import * as fs from "fs";
import { readReviewsHandler } from "../../src/tools/reviews.js";

describe("readReviewsHandler", () => {
  it("reads and returns markdown files from directory", async () => {
    vi.mocked(glob).mockResolvedValue(["/notes/game1.md", "/notes/game2.md"]);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce("# Game 1\nGreat atmosphere." as any)
      .mockReturnValueOnce("# Game 2\nToo hard." as any);

    const result = await readReviewsHandler("/notes", 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ file: "/notes/game1.md", content: "# Game 1\nGreat atmosphere." });
  });

  it("respects the limit parameter", async () => {
    vi.mocked(glob).mockResolvedValue(["/notes/a.md", "/notes/b.md", "/notes/c.md"]);
    vi.mocked(fs.readFileSync).mockReturnValue("content" as any);

    const result = await readReviewsHandler("/notes", 2);
    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tools/reviews.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/tools/reviews.ts`**

```typescript
import { glob } from "glob";
import * as fs from "fs";

interface ReviewEntry {
  file: string;
  content: string;
}

export async function readReviewsHandler(dir: string, limit: number): Promise<ReviewEntry[]> {
  const files = await glob(`${dir}/**/*.md`);
  return files.slice(0, limit).map((file) => ({
    file,
    content: fs.readFileSync(file, "utf-8"),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tools/reviews.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/tools/reviews.ts tests/tools/reviews.test.ts
git commit -m "feat: read_reviews tool (Obsidian/Markdown reader)"
```

---

## Task 9: PE Reader Utility

**Files:**
- Create: `src/lib/pe-reader.ts`
- Create: `tests/lib/pe-reader.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/pe-reader.test.ts
import { describe, it, expect, vi } from "vitest";
import * as child_process from "child_process";

vi.mock("child_process");

const { readPEVersionInfo } = await import("../../src/lib/pe-reader.js");

describe("readPEVersionInfo", () => {
  it("extracts ProductName and OriginalFilename from exe", () => {
    vi.mocked(child_process.execFileSync).mockReturnValue(
      JSON.stringify({ ProductName: "The Witcher 3", OriginalFilename: "witcher3.exe" }) as any
    );

    const result = readPEVersionInfo("C:/Games/witcher3.exe");
    expect(result.productName).toBe("The Witcher 3");
    expect(result.originalFilename).toBe("witcher3.exe");
  });

  it("returns empty strings when PowerShell fails", () => {
    vi.mocked(child_process.execFileSync).mockImplementation(() => { throw new Error("Access denied"); });

    const result = readPEVersionInfo("C:/Games/unknown.exe");
    expect(result.productName).toBe("");
    expect(result.originalFilename).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/pe-reader.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/lib/pe-reader.ts`**

```typescript
import { execFileSync } from "child_process";

export interface PEVersionInfo {
  productName: string;
  originalFilename: string;
}

export function readPEVersionInfo(exePath: string): PEVersionInfo {
  // Escape single quotes for PowerShell literal path
  const safePath = exePath.replace(/'/g, "''");
  const script = `(Get-Item -LiteralPath '${safePath}').VersionInfo | Select-Object ProductName, OriginalFilename | ConvertTo-Json`;
  try {
    const output = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      timeout: 5000,
    });
    const parsed = JSON.parse(output.trim());
    return {
      productName: parsed.ProductName ?? "",
      originalFilename: parsed.OriginalFilename ?? "",
    };
  } catch {
    return { productName: "", originalFilename: "" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/pe-reader.test.ts
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/pe-reader.ts tests/lib/pe-reader.test.ts
git commit -m "feat: PE reader utility (extracts game name from .exe via PowerShell)"
```

---

## Task 10: Fuzzy Match Utility

**Files:**
- Create: `src/lib/fuzzy-match.ts`
- Create: `tests/lib/fuzzy-match.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/fuzzy-match.test.ts
import { describe, it, expect, vi } from "vitest";
import axios from "axios";

vi.mock("axios");

const { normalizeGameName } = await import("../../src/lib/fuzzy-match.js");

beforeEach(() => {
  process.env.RAWG_API_KEY = "test_key";
});

describe("normalizeGameName", () => {
  it("returns canonical RAWG name for a close match", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { results: [{ name: "The Witcher 3: Wild Hunt" }, { name: "The Witcher 2" }] },
    });

    const result = await normalizeGameName("witcher3");
    expect(result).toBe("The Witcher 3: Wild Hunt");
  });

  it("returns original name when RAWG returns no results", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { results: [] } });

    const result = await normalizeGameName("SomeObscureGame");
    expect(result).toBe("SomeObscureGame");
  });

  it("returns original name when RAWG call fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

    const result = await normalizeGameName("CoolGame");
    expect(result).toBe("CoolGame");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/fuzzy-match.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/lib/fuzzy-match.ts`**

```typescript
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

    const fuse = new Fuse(candidates);
    const matches = fuse.search(rawName);
    return matches.length > 0 ? matches[0].item : candidates[0];
  } catch {
    return rawName;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/fuzzy-match.test.ts
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/fuzzy-match.ts tests/lib/fuzzy-match.test.ts
git commit -m "feat: fuzzy game name normalization via RAWG API"
```

---

## Task 11: scan_local_games Tool

**Files:**
- Create: `src/tools/scanner.ts`
- Create: `tests/tools/scanner.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/tools/scanner.test.ts
import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

vi.mock("fs");
vi.mock("glob", () => ({ glob: vi.fn() }));
vi.mock("../../src/lib/acf-parser.js", () => ({ parseAcf: vi.fn() }));
vi.mock("../../src/lib/pe-reader.js", () => ({ readPEVersionInfo: vi.fn() }));
vi.mock("../../src/lib/fuzzy-match.js", () => ({ normalizeGameName: vi.fn() }));
vi.mock("../../src/tools/profile.js", () => ({ readProfile: vi.fn(), writeProfile: vi.fn() }));

import { glob } from "glob";
import { parseAcf } from "../../src/lib/acf-parser.js";
import { readPEVersionInfo } from "../../src/lib/pe-reader.js";
import { normalizeGameName } from "../../src/lib/fuzzy-match.js";
import { readProfile, writeProfile } from "../../src/tools/profile.js";
import { scanLocalGamesHandler } from "../../src/tools/scanner.js";

const baseProfile = {
  preferences: { favorite_genres: [], favorite_mechanics: [], vibe_tags: [], disliked_genres: [] },
  interview_history: [],
  library_cache: { steam: [], local: [], last_updated: null },
};

describe("scanLocalGamesHandler", () => {
  it("finds games from .acf manifests and normalizes names", async () => {
    vi.mocked(glob)
      .mockResolvedValueOnce(["C:/Steam/steamapps/appmanifest_730.acf"]) // .acf files
      .mockResolvedValueOnce([]) // .egstore
      .mockResolvedValueOnce([]); // .exe files
    vi.mocked(fs.readFileSync).mockReturnValue("acf content" as any);
    vi.mocked(parseAcf).mockReturnValue({ appid: "730", name: "cs2" });
    vi.mocked(normalizeGameName).mockResolvedValue("Counter-Strike 2");
    vi.mocked(readProfile).mockReturnValue({ ...baseProfile });

    const result = await scanLocalGamesHandler(["C:/Steam/steamapps"]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Counter-Strike 2");
    expect(result[0].source).toBe("steam_manifest");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tools/scanner.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/tools/scanner.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tools/scanner.test.ts
```

Expected: 1 passed

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/tools/scanner.ts tests/tools/scanner.test.ts
git commit -m "feat: scan_local_games tool (ACF + Epic manifests + PE header fallback)"
```

---

## Task 12: MCP Server Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Implement `src/index.ts`**

```typescript
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { manageProfileHandler } from "./tools/profile.js";
import { getSteamLibraryHandler } from "./tools/steam.js";
import { getHltbDataHandler } from "./tools/hltb.js";
import { readReviewsHandler } from "./tools/reviews.js";
import { scanLocalGamesHandler } from "./tools/scanner.js";

const server = new McpServer({
  name: "gaming-assistant",
  version: "1.0.0",
});

server.tool(
  "manage_profile",
  "Read or write the user's gaming profile (preferences, interview history, library cache).",
  { action: z.enum(["read", "write"]), data: z.object({}).passthrough().optional() },
  async ({ action, data }) => {
    const result = await manageProfileHandler(action, data);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_steam_library",
  "Fetch the user's Steam game library (list of games with playtime). Set refresh=true to bypass cache.",
  { refresh: z.boolean() },
  async ({ refresh }) => {
    const games = await getSteamLibraryHandler(refresh);
    return { content: [{ type: "text", text: JSON.stringify(games, null, 2) }] };
  }
);

server.tool(
  "get_hltb_data",
  "Get HowLongToBeat completion times (main story, extras, completionist) for a game.",
  { title: z.string() },
  async ({ title }) => {
    const data = await getHltbDataHandler(title);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "read_reviews",
  "Read Markdown note files from a directory (e.g. Obsidian vault) for taste analysis.",
  { dir: z.string(), limit: z.number().int().min(1).max(100).default(20) },
  async ({ dir, limit }) => {
    const notes = await readReviewsHandler(dir, limit);
    return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
  }
);

server.tool(
  "scan_local_games",
  "Scan local directories for installed games using manifest files and .exe PE headers.",
  { paths: z.array(z.string()).min(1) },
  async ({ paths }) => {
    const games = await scanLocalGamesHandler(paths);
    return { content: [{ type: "text", text: JSON.stringify(games, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build the project**

```bash
npm run build
```

Expected: `dist/` directory created, no TypeScript errors.

- [ ] **Step 3: Add MCP server to Claude Code config**

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "gaming-assistant": {
      "command": "node",
      "args": ["C:/Users/skush/Desktop/wtfaboba/wtp/dist/index.js"],
      "env": {
        "STEAM_API_KEY": "your_steam_api_key",
        "STEAM_ID": "your_steam_id",
        "RAWG_API_KEY": "your_rawg_api_key",
        "PROFILE_PATH": "C:/Users/skush/gaming_profile.json"
      }
    }
  }
}
```

- [ ] **Step 4: Verify MCP server responds**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

Expected: JSON response listing all 5 tools (`manage_profile`, `get_steam_library`, `get_hltb_data`, `read_reviews`, `scan_local_games`).

- [ ] **Step 5: Run all tests one final time**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add src/index.ts
git commit -m "feat: MCP server entry point — wires all 5 tools"
```

---

## Self-Review

**Spec coverage:**
- Steam library → `get_steam_library` + `src/lib/steam-api.ts` ✓
- Local games → `scan_local_games` (ACF, Epic, PE headers) ✓
- Obsidian notes → `read_reviews` ✓
- HLTB data → `get_hltb_data` ✓
- Profile storage → `manage_profile` + `gaming_profile.json` ✓
- Fuzzy matching → `src/lib/fuzzy-match.ts` via RAWG API ✓
- .env security → `.env.example`, keys never hardcoded ✓

**Placeholder scan:** None found.

**Type consistency:** `SteamGame`, `LocalGame`, `GamingProfile`, `HltbEntry` defined in `src/types.ts` and referenced consistently across all tool files.
