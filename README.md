# Gaming Assistant MCP

A Model Context Protocol (MCP) server for Claude Code that turns Claude into an intelligent personal gaming advisor.

It gives Claude direct access to your Steam library, locally installed games, Obsidian notes, and HowLongToBeat data — so Claude can interview you about your tastes, discover hidden gems in your library, and generate personalized recommendations.

## What it does

**Interview mode** — Claude reads your profile, finds gaps, and asks targeted questions to build a taste model.

**Discovery mode** — Claude searches for games in genres you haven't explored yet, matching the mechanics and vibe of your favorites.

**Library report** — Claude generates a detailed Markdown file with taste analytics and ranked recommendations from your own unplayed library.

## Tools exposed to Claude

| Tool | What it does |
|:---|:---|
| `manage_profile` | Read / write `gaming_profile.json` — preferences, interview history, library cache |
| `get_steam_library` | Fetch your Steam games + playtime via Steam Web API |
| `get_hltb_data` | Get HowLongToBeat completion times for any game |
| `read_reviews` | Read Markdown notes from an Obsidian vault for taste analysis |
| `scan_local_games` | Deep-scan local folders: ACF manifests, Epic installs, `.exe` PE headers |

## Requirements

- [Claude Code](https://claude.ai/code) (CLI or desktop app)
- [Node.js](https://nodejs.org) v20 or later
- Windows (the `scan_local_games` PE reader uses PowerShell; other tools work cross-platform)
- Steam Web API key — free at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
- RAWG API key (optional, for game name normalization) — free at [rawg.io/apidocs](https://rawg.io/apidocs)

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/gaming-assistant-mcp
cd gaming-assistant-mcp
npm install
npm run build
```

Then add the server to Claude Code:

```bash
claude mcp add "gaming-assistant" -s user \
  -e "STEAM_API_KEY=your_steam_key" \
  -e "STEAM_ID=your_64bit_steam_id" \
  -e "RAWG_API_KEY=your_rawg_key" \
  -e "PROFILE_PATH=C:/Users/yourname/gaming_profile.json" \
  -- node "$(pwd)/dist/index.js"
```

Verify it connected:

```bash
claude mcp list
# gaming-assistant: ... ✓ Connected
```

## Finding your Steam ID

Go to [steamid.io](https://steamid.io), enter your Steam profile URL, and copy the **steamID64** (17-digit number starting with `7656...`).

## Usage examples

Once connected, just talk to Claude:

> *"Scan my Steam library and tell me which games I've ignored the longest"*

> *"I love Dark Souls and Hollow Knight. What else in my library has that same vibe?"*

> *"Interview me about my gaming tastes and build my profile"*

> *"How long would it take to finish the games on my backlog?"*

> *"Generate a full leisure report from my library"*

## Configuration

All config is in environment variables passed to the MCP server:

| Variable | Required | Description |
|:---|:---|:---|
| `STEAM_API_KEY` | Yes | Steam Web API key |
| `STEAM_ID` | Yes | Your 64-bit Steam ID |
| `RAWG_API_KEY` | No | RAWG key for game name normalization |
| `PROFILE_PATH` | No | Path to `gaming_profile.json` (default: `./gaming_profile.json`) |

## Project structure

```
src/
  index.ts          # MCP server entry point
  types.ts          # Shared TypeScript interfaces
  tools/
    profile.ts      # manage_profile
    steam.ts        # get_steam_library
    hltb.ts         # get_hltb_data
    reviews.ts      # read_reviews
    scanner.ts      # scan_local_games
  lib/
    steam-api.ts    # Steam Web API client
    acf-parser.ts   # Steam .acf manifest parser
    pe-reader.ts    # Windows .exe PE header reader
    fuzzy-match.ts  # RAWG-based game name normalization
```

## Development

```bash
npm run build        # Compile TypeScript
npm test             # Run tests (19 tests)
npm run test:watch   # Watch mode
```

## License

MIT
