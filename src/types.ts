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
