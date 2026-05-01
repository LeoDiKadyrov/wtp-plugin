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
