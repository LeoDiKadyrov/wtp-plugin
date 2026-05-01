import { readProfile } from "./profile.js";
import type { SessionState, NextStep } from "../types.js";

const BASELINE_QUESTIONS = [
  "What are the last 3 games you genuinely loved — and what specifically made each one click for you?",
  "Describe your ideal gaming session right now: how long, what mood, solo or co-op?",
  "What genres do you keep coming back to, even if you can't explain why?",
  "What mechanics or design patterns instantly kill your interest in a game?",
  "Name a game that everyone loves but you bounced off of hard. What went wrong?",
  "Do you care more about story, systems, or feel — and what's a game that nailed your priority?",
  "What's your backlog situation: completionist, cherry-picker, or 'just want something good tonight'?",
  "Any genres you've never tried but are curious about?",
];

const MICRO_QUESTIONS = [
  "What have you been playing since we last talked, and did any of them surprise you?",
  "Has your mood or time budget for gaming shifted recently?",
  "Anything you started and immediately quit — what killed it?",
];

const STALE_DAYS = 30;

export function startSessionHandler(): SessionState {
  const profile = readProfile();
  const prefs = profile.preferences;
  const cache = profile.library_cache;
  const history = profile.interview_history;

  const isFirstRun = history.length === 0;
  const prefsEmpty =
    prefs.favorite_genres.length === 0 &&
    prefs.favorite_mechanics.length === 0 &&
    prefs.vibe_tags.length === 0;

  const libraryLoaded = cache.steam.length > 0 || cache.local.length > 0;
  const profileComplete = !prefsEmpty && libraryLoaded && history.length > 0;

  let daysSinceLast: number | null = null;
  if (history.length > 0) {
    const last = new Date(history[history.length - 1].date);
    daysSinceLast = Math.floor((Date.now() - last.getTime()) / 86_400_000);
  }

  const needsMicro = !isFirstRun && daysSinceLast !== null && daysSinceLast >= STALE_DAYS;
  const phase: "onboarding" | "returning" = isFirstRun ? "onboarding" : "returning";

  const steps: NextStep[] = [];
  let stepNum = 1;

  if (!cache.steam.length) {
    steps.push({
      step: stepNum++,
      action: "load_steam_library",
      tool: "get_steam_library",
      params: { refresh: true },
      description: "Fetch Steam library to discover owned games and playtime data.",
    });
  }

  if (isFirstRun || prefsEmpty) {
    steps.push({
      step: stepNum++,
      action: "baseline_interview",
      tool: null,
      params: null,
      description:
        "Ask the baseline interview questions one by one. Wait for answers before moving on. After all answers, call manage_profile(write) with extracted preferences.",
    });
  } else if (needsMicro) {
    steps.push({
      step: stepNum++,
      action: "micro_interview",
      tool: null,
      params: null,
      description: `Profile is ${daysSinceLast} days old. Ask micro-interview questions to refresh taste model, then update profile.`,
    });
  }

  if (cache.steam.length > 0) {
    steps.push({
      step: stepNum++,
      action: "analyze_library",
      tool: "get_steam_library",
      params: { refresh: false },
      description:
        "Cross-reference library with taste model. Identify unplayed gems (high playtime ceiling, matches vibe), hidden hours (owned but 0 playtime), and genre gaps.",
    });
  }

  steps.push({
    step: stepNum++,
    action: "generate_recommendations",
    tool: null,
    params: null,
    description:
      "Produce ranked recommendations: (1) unplayed games already owned that match taste, (2) games worth revisiting, (3) genres to explore. Use get_hltb_data for time estimates on top picks. Use get_critic_score to validate quality.",
  });

  return {
    phase,
    profile_complete: profileComplete,
    library_loaded: libraryLoaded,
    interview_done: !isFirstRun && !prefsEmpty,
    days_since_last_interview: daysSinceLast,
    taste_model: {
      favorite_genres: prefs.favorite_genres,
      favorite_mechanics: prefs.favorite_mechanics,
      vibe_tags: prefs.vibe_tags,
      disliked_genres: prefs.disliked_genres,
      steam_game_count: cache.steam.length,
      local_game_count: cache.local.length,
    },
    next_steps: steps,
    interview_questions: isFirstRun || prefsEmpty
      ? BASELINE_QUESTIONS
      : needsMicro
      ? MICRO_QUESTIONS
      : null,
  };
}
