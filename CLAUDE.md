# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build        # tsc → dist/
npm run dev          # tsc --watch
npm test             # vitest run (all tests)
npx vitest run tests/tools/scanner.test.ts   # single test file
npm start            # node dist/index.js (runs MCP server via stdio)
```

## Environment Variables

Required in `.env` at project root:

| Var | Used by |
|-|-|
| `STEAM_API_KEY` | `fetchSteamLibrary` (Steam Web API), `normalizeGameName` (Steam Store search) |
| `STEAM_ID` | `fetchSteamLibrary` |
| `PROFILE_PATH` | overrides default `gaming_profile.json` location (optional) |

## Architecture

**MCP server** (`src/index.ts`) wires 7 tools using `@modelcontextprotocol/sdk`. Runs over stdio — clients connect via `npx` or `node dist/index.js`.

### Tool → Handler → Lib

```
src/index.ts          (MCP tool registration + Zod schemas)
  └─ src/tools/       (one handler per tool)
       ├─ session.ts      start_session — computes phase/taste model/next_steps from profile
       ├─ steam.ts        get_steam_library — wraps fetchSteamLibrary with profile cache
       ├─ scanner.ts      scan_local_games — ACF + egstore + PE header fallback
       ├─ hltb.ts         get_hltb_data — HowLongToBeat via howlongtobeat npm
       ├─ opencritic.ts   get_critic_score — OpenCritic REST API (no key needed)
       ├─ reviews.ts      read_reviews — reads .md files from a directory (Obsidian vault)
       └─ profile.ts      manage_profile — R/W gaming_profile.json
  └─ src/lib/
       ├─ steam-api.ts    raw Steam Web API call
       ├─ fuzzy-match.ts  normalizeGameName — Steam Store search + Fuse.js scoring
       ├─ acf-parser.ts   parse Steam .acf manifest format
       └─ pe-reader.ts    read Windows PE version info from .exe
```

### State: `gaming_profile.json`

Single JSON file persists all state: `preferences`, `interview_history`, `library_cache` (steam + local). `start_session` reads this to decide onboarding vs returning flow and emits an ordered `next_steps` array for the LLM client to follow.

### Module system

`"type": "module"` + `"moduleResolution": "NodeNext"` — all local imports **must** use `.js` extension even for `.ts` source files.

## Testing

Tests use **vitest** with heavy mocking. All external calls (fs, glob, axios, howlongtobeat, Steam API) are mocked — tests are unit-level only. No integration tests against live APIs. Test files mirror src structure under `tests/`.
