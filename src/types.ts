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

export interface NextStep {
  step: number;
  action: string;
  tool: string | null;
  params: object | null;
  description: string;
}

export interface SessionState {
  phase: "onboarding" | "returning";
  profile_complete: boolean;
  library_loaded: boolean;
  interview_done: boolean;
  days_since_last_interview: number | null;
  taste_model: {
    favorite_genres: string[];
    favorite_mechanics: string[];
    vibe_tags: string[];
    disliked_genres: string[];
    steam_game_count: number;
    local_game_count: number;
  };
  next_steps: NextStep[];
  interview_questions: string[] | null;
}

export interface OpenCriticResult {
  title: string;
  found: boolean;
  score: number | null;       // 0–100
  tier: string | null;        // Mighty / Strong / Fair / Weak
  review_count: number | null;
  url: string | null;
}
