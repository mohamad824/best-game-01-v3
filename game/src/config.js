// Star Shepherd — shared configuration and tuning constants.
// One place for every number the physics, levels, and renderers agree on.
// This module has no DOM access, so the Node solver can import it too.

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

export const SIM_DT = 1 / 120;
export const SIM_MAX_SECONDS = 40;

export const WELL_PULL_MAX = 320;
export const WELL_FALLOFF_RANGE = 150;
export const WELL_MIN_SEPARATION = 38;
export const WELL_MIN_START_DISTANCE = 52;
export const WELL_DRAW_RADIUS = 17;

export const PLACE_BOUNDS = { minX: 28, maxX: 1252, minY: 96, maxY: 692 };

export const BLACK_HOLE_DEFAULT_STRENGTH = 3600000;
export const BLACK_HOLE_DEFAULT_CAPTURE = 24;
export const BLACK_HOLE_SOFTENING = 22;
export const BLACK_HOLE_WARNING_DISTANCE = 78;

export const STAR_COLLECT_RADIUS = 32;
export const HOME_STAR_COLLECT_RADIUS = 38;
export const STAR_DRAW_RADIUS = 13;
export const HOME_STAR_DRAW_RADIUS = 20;

export const COMET_MAX_SPEED = 560;
export const COMET_DRAW_RADIUS = 10;
export const COMET_DRIFT_MARGIN = 48;

export const SCORE_PER_STAR = 100;
export const SCORE_FUEL_MULTIPLIER = 10;
export const SCORE_WELL_BONUS = 50;
export const SCORE_WIN_BONUS = 200;

export const PALETTE = {
  deepSpace: "#070718",
  indigoMid: "#141038",
  nebulaViolet: "#4b2a7a",
  nebulaTeal: "#144d5e",
  cometGold: "#ffd76a",
  cometCore: "#fff6d8",
  wellCyan: "#4de8ff",
  wellDeep: "#0e6f8e",
  starWhite: "#ffffff",
  hazardMagenta: "#ff4fd8",
  hazardViolet: "#9b4dff",
  voidPurple: "#2a0a3e",
  textSoft: "#cfd6ff",
};

export const OBJECTIVE_LINE =
  "Collect every star before the fuel runs out — black holes capture, void zones destroy.";
