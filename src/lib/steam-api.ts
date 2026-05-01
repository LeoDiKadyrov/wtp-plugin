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
