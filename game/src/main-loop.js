// Star Shepherd — main loop and boot.
// Fixed-timestep simulation (120 Hz accumulator) with render-only
// interpolation, so the flight is deterministic and the picture is
// smooth. The loop owns the mode machine, input wiring, HUD sync,
// end-of-flight handling, and screenshot staging.

import { SIM_DT, WORLD_HEIGHT, WORLD_WIDTH } from "./config.js";
import { createCometState, stepComet } from "./comet-physics.js";
import { predictHazardWarning, predictTrajectoryPath } from "./trajectory-predictor.js";
import { getLevel, levelCount, totalStarsInCampaign } from "./level-definitions.js";
import {
  createCampaignState,
  isFinalLevel,
  lossReasonText,
  lossReasonTitle,
  recordLevelAttempt,
  recordLevelWin,
} from "./game-state.js";
import {
  moveWellTo,
  nearestWellIndex,
  placeWell,
  removeLastWell,
  removeWellNear,
  wellPlacementIsLegal,
} from "./well-placement.js";
import { createStarfield, drawStarfieldBackground } from "./starfield-background.js";
import {
  drawBlackHole,
  drawCollectibleStar,
  drawCometWithTrail,
  drawGravityWell,
  drawLaunchBeacon,
  drawPredictedPath,
  drawVoidZone,
} from "./entity-renderer.js";
import {
  clearParticles,
  createParticleSystem,
  drawParticles,
  spawnCaptureBurst,
  spawnFloatingText,
  spawnStarBurst,
  spawnWellShockwave,
  updateParticles,
} from "./particle-effects.js";
import { createShepherdAudio } from "./audio-synth.js";
import { createHudController } from "./hud-controller.js";
import { createScreenController } from "./screen-controller.js";
import { attachKeyboardControls, attachPointerControls } from "./input-controller.js";
import {
  advanceCometToStep,
  parseShotParams,
  stagedCampaignStats,
} from "./shot-staging.js";
import { clampNumber, lerpNumber, vecDistance } from "./vector-math.js";

window.__starShepherdErrors = [];
window.addEventListener("error", (event) => {
  window.__starShepherdErrors.push(String(event.message || event.error));
});
window.addEventListener("unhandledrejection", (event) => {
  window.__starShepherdErrors.push(String(event.reason));
});
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  window.__starShepherdErrors.push(args.map((arg) => String(arg)).join(" "));
  originalConsoleError(...args);
};

const stage = document.getElementById("stage");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const audio = createShepherdAudio();
const hud = createHudController(document);
const screens = createScreenController(document);

const game = {
  mode: "title",
  pausedFrom: "planning",
  levelIndex: 0,
  level: getLevel(0),
  starfield: createStarfield(getLevel(0).seed),
  wells: [],
  ghost: null,
  pointer: null,
  draggingIndex: -1,
  selectedIndex: -1,
  comet: createCometState(getLevel(0)),
  prevX: getLevel(0).start.x,
  prevY: getLevel(0).start.y,
  accumulator: 0,
  trail: [],
  particles: createParticleSystem(getLevel(0).seed),
  campaign: createCampaignState(),
  renderTime: 0,
  flightSeconds: 0,
  combo: 0,
  muted: false,
  prediction: null,
  warning: { level: "none", text: "" },
  lastWarningLevel: "none",
  pendingResult: null,
  fuelLeftTotal: 0,
  shot: null,
  lastFrameNow: 0,
};

function fitStage() {
  const scale = Math.min(window.innerWidth / WORLD_WIDTH, window.innerHeight / WORLD_HEIGHT);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function loadLevel(levelIndex) {
  game.levelIndex = levelIndex;
  game.level = getLevel(levelIndex);
  game.starfield = createStarfield(game.level.seed);
  game.particles = createParticleSystem(game.level.seed);
  game.wells = [];
  game.ghost = null;
  game.draggingIndex = -1;
  game.selectedIndex = -1;
  game.comet = createCometState(game.level);
  game.prevX = game.level.start.x;
  game.prevY = game.level.start.y;
  game.accumulator = 0;
  game.trail = [];
  game.flightSeconds = 0;
  game.combo = 0;
  game.pendingResult = null;
  game.lastWarningLevel = "none";
  game.mode = "planning";
  audio.stopDrone();
  recomputePrediction();
}

function restartLevel() {
  const index = game.levelIndex;
  loadLevel(index);
  screens.hideAllScreens();
}

function startCampaign() {
  game.campaign = createCampaignState();
  game.fuelLeftTotal = 0;
  loadLevel(0);
  screens.hideAllScreens();
}

function launchComet() {
  if (game.mode !== "planning") return;
  game.comet = createCometState(game.level);
  game.prevX = game.level.start.x;
  game.prevY = game.level.start.y;
  game.accumulator = 0;
  game.trail = [{ x: game.level.start.x, y: game.level.start.y }];
  game.flightSeconds = 0;
  game.combo = 0;
  game.pendingResult = null;
  game.ghost = null;
  game.mode = "flying";
  audio.playLaunchWhoosh();
  recomputePrediction();
}

function togglePause() {
  if (game.mode === "paused") {
    game.mode = game.pausedFrom;
    screens.hideAllScreens();
    hud.setPauseLabel(false);
    game.lastFrameNow = 0;
    return;
  }
  if (game.mode === "planning" || game.mode === "flying") {
    game.pausedFrom = game.mode;
    game.mode = "paused";
    audio.stopDrone();
    screens.showPauseOverlay(`${game.levelIndex + 1} — ${game.level.name}`);
    hud.setPauseLabel(true);
  }
}

function toggleMute() {
  game.muted = !game.muted;
  audio.setMuted(game.muted);
  hud.setSoundLabel(game.muted);
}

function jumpToLevel(levelIndex) {
  if (levelIndex < 0 || levelIndex >= levelCount()) return;
  if (game.mode === "title" || game.mode === "campaignComplete") return;
  loadLevel(levelIndex);
  screens.hideAllScreens();
}

function ghostWellIsUsable() {
  if (!game.ghost) return false;
  if (game.wells.length >= game.level.wells) return false;
  return wellPlacementIsLegal(game.wells, game.ghost.x, game.ghost.y, game.level.wells, game.level);
}

function recomputePrediction() {
  if (game.mode === "planning" || game.mode === "paused" || game.mode === "title") {
    const wells = ghostWellIsUsable() ? game.wells.concat([game.ghost]) : game.wells;
    game.prediction = predictTrajectoryPath(game.level, wells);
    game.warning = predictHazardWarning(game.level, wells);
  } else if (game.mode === "flying") {
    game.prediction = predictTrajectoryPath(game.level, game.wells, game.comet);
    game.warning = predictHazardWarning(game.level, game.wells, game.comet);
  }
  if (game.warning.level === "danger" && game.lastWarningLevel !== "danger") {
    audio.playWarningBlip();
  }
  game.lastWarningLevel = game.warning.level;
}

function nearestBlackHoleClearance() {
  let best = Infinity;
  for (const hole of game.level.blackHoles) {
    const distance = vecDistance(game.comet.x, game.comet.y, hole.x, hole.y);
    best = Math.min(best, distance - (hole.captureRadius || 24));
  }
  return best;
}

function collectNewStars(previousCollected) {
  for (let i = 0; i < game.level.stars.length; i += 1) {
    if (!previousCollected[i] && game.comet.collected[i]) {
      const star = game.level.stars[i];
      game.combo += 1;
      spawnStarBurst(game.particles, star.x, star.y, game.combo);
      audio.playCollectChime(game.combo - 1);
      if (star.home) {
        spawnFloatingText(game.particles, star.x, star.y - 20, "HOME STAR REIGNITED!", "#ffd76a");
      } else {
        spawnFloatingText(
          game.particles,
          star.x,
          star.y - 16,
          game.combo > 1 ? `+1 ★  COMBO ×${game.combo}` : "+1 ★",
          "#ffe9b0",
        );
      }
    }
  }
}

function beginEndSequence() {
  const result = {
    status: game.comet.status,
    lossReason: game.comet.lossReason,
    starsCollected: game.comet.starsCollected,
    starsTotal: game.level.stars.length,
    fuelRemaining: Math.max(0, game.comet.fuel),
  };
  if (result.status === "lost" && (result.lossReason === "blackhole" || result.lossReason === "void")) {
    spawnCaptureBurst(game.particles, game.comet.x, game.comet.y);
  }
  if (result.status === "lost") audio.playLossTone();
  audio.stopDrone();
  game.pendingResult = { timer: 0.8, result };
}

function finishEndSequence() {
  const { result } = game.pendingResult;
  game.pendingResult = null;
  if (result.status === "won") {
    const score = recordLevelWin(
      game.campaign, game.level, result, game.wells.length, game.flightSeconds,
    );
    game.fuelLeftTotal += result.fuelRemaining;
    audio.playWinFanfare();
    if (isFinalLevel(game.levelIndex)) {
      game.mode = "campaignComplete";
      screens.showCampaignResultsScreen({
        starsGathered: game.campaign.starsGathered,
        starsTotal: totalStarsInCampaign(),
        fuelRemainingTotal: game.fuelLeftTotal,
        wellsUsedTotal: game.campaign.wellsUsedTotal,
        totalScore: game.campaign.totalScore,
        flightSecondsTotal: game.campaign.flightSecondsTotal,
        levelsWon: game.campaign.levelsWon,
      });
    } else {
      game.mode = "levelComplete";
      screens.showLevelCompleteScreen({
        levelName: game.level.name,
        isFinal: false,
        starsCollected: result.starsCollected,
        starsTotal: result.starsTotal,
        fuelRemaining: result.fuelRemaining,
        wellsUsed: game.wells.length,
        wellsBudget: game.level.wells,
        levelScore: score.total,
        flightSeconds: game.flightSeconds,
        totalScore: game.campaign.totalScore,
      });
    }
    return;
  }
  recordLevelAttempt(game.campaign, game.flightSeconds);
  game.mode = "lost";
  const hints = {
    blackhole: "Hint: bend the path wider around the black hole — skim it, never touch it.",
    void: "Hint: place a well to curve around the void zone, not through it.",
    fuel: "Hint: fewer loops, gentler curves — the shortest true path saves fuel.",
    drifted: "Hint: bend the comet back toward the stars before it leaves the sky.",
  };
  screens.showLossScreen({
    title: lossReasonTitle(result.lossReason),
    reason: lossReasonText(result.lossReason),
    starsCollected: result.starsCollected,
    starsTotal: result.starsTotal,
    fuelRemaining: result.fuelRemaining,
    wellsUsed: game.wells.length,
    wellsBudget: game.level.wells,
    hint: hints[result.lossReason] || hints.fuel,
  });
}

function stepFlight(dtRender) {
  game.accumulator += dtRender;
  let steps = 0;
  while (game.accumulator >= SIM_DT && steps < 48 && game.comet.status === "flying") {
    const previousCollected = game.comet.collected.slice();
    game.prevX = game.comet.x;
    game.prevY = game.comet.y;
    stepComet(game.comet, game.level, game.wells);
    game.flightSeconds += SIM_DT;
    game.accumulator -= SIM_DT;
    steps += 1;
    collectNewStars(previousCollected);
  }
  if (game.comet.status !== "flying" && !game.pendingResult) beginEndSequence();
  audio.updateProximityDrone(nearestBlackHoleClearance(), game.mode === "flying");
}

function renderCometPosition(alpha) {
  if (game.mode === "planning" || game.mode === "title") {
    return { x: game.level.start.x, y: game.level.start.y, vx: 0, vy: 0 };
  }
  return {
    x: lerpNumber(game.prevX, game.comet.x, clampNumber(alpha, 0, 1)),
    y: lerpNumber(game.prevY, game.comet.y, clampNumber(alpha, 0, 1)),
    vx: game.comet.vx,
    vy: game.comet.vy,
  };
}

function render(alpha) {
  const cometPos = renderCometPosition(alpha);
  drawStarfieldBackground(ctx, game.starfield, game.renderTime, cometPos);

  if (game.mode === "planning" || game.mode === "title" || game.mode === "paused") {
    drawLaunchBeacon(ctx, game.level, game.renderTime);
  }
  for (const zone of game.level.voidZones) drawVoidZone(ctx, zone, game.renderTime);
  for (const hole of game.level.blackHoles) drawBlackHole(ctx, hole, game.renderTime);
  for (let i = 0; i < game.level.stars.length; i += 1) {
    drawCollectibleStar(ctx, game.level.stars[i], game.comet.collected[i], game.renderTime, i);
  }
  for (const well of game.wells) drawGravityWell(ctx, well, game.renderTime, false);
  if (game.mode === "planning" && game.ghost && ghostWellIsUsable()) {
    drawGravityWell(ctx, game.ghost, game.renderTime, true);
  }

  if (game.prediction && (game.mode === "planning" || game.mode === "flying" || game.mode === "title")) {
    ctx.save();
    if (game.mode === "flying") ctx.globalAlpha = 0.7;
    if (game.mode === "title") ctx.globalAlpha = 0.3;
    drawPredictedPath(ctx, game.prediction.points, game.prediction.outcome, game.renderTime);
    ctx.restore();
  }

  const showTrail = game.mode === "flying" || game.pendingResult !== null || game.shot?.shot === "cover";
  drawCometWithTrail(
    ctx,
    cometPos.x,
    cometPos.y,
    cometPos.vx,
    cometPos.vy,
    showTrail ? game.trail : [],
    game.renderTime,
  );
  drawParticles(ctx, game.particles);
}

function updateHud() {
  hud.updateHudDisplay({
    levelIndex: game.levelIndex,
    levelName: game.level.name,
    briefing: game.level.briefing,
    starsCollected: game.comet.starsCollected,
    starsTotal: game.level.stars.length,
    fuel: Math.max(0, game.comet.fuel),
    fuelMax: game.level.fuel,
    wellsPlaced: game.wells.length,
    wellsRemaining: game.level.wells - game.wells.length,
    score: game.campaign.totalScore,
    mode: game.mode,
    warning: game.mode === "planning" || game.mode === "flying" ? game.warning : { level: "none", text: "" },
  });
  hud.setPauseLabel(game.mode === "paused");
}

function tick(now) {
  requestAnimationFrame(tick);
  if (game.lastFrameNow === 0) game.lastFrameNow = now;
  let dtRender = (now - game.lastFrameNow) / 1000;
  game.lastFrameNow = now;
  if (!Number.isFinite(dtRender) || dtRender < 0) dtRender = 0;
  dtRender = Math.min(dtRender, 0.1);

  if (game.shot) {
    game.renderTime = game.shot.frozenTime;
    render(1);
    updateHud();
    window.__shotReady = true;
    return;
  }

  if (game.mode === "paused") {
    render(1);
    updateHud();
    return;
  }

  game.renderTime += dtRender;

  if (game.mode === "flying" && !game.pendingResult) {
    stepFlight(dtRender);
    recomputePrediction();
  }
  if (game.mode === "planning") recomputePrediction();

  if (game.pendingResult) {
    game.pendingResult.timer -= dtRender;
    if (game.pendingResult.timer <= 0) finishEndSequence();
  }

  const alpha = game.mode === "flying" ? game.accumulator / SIM_DT : 1;
  const cometPos = renderCometPosition(alpha);
  if (game.mode === "flying" && !game.pendingResult) {
    const last = game.trail[game.trail.length - 1];
    if (!last || vecDistance(last.x, last.y, cometPos.x, cometPos.y) > 3) {
      game.trail.push({ x: cometPos.x, y: cometPos.y });
      while (game.trail.length > 46) game.trail.shift();
    }
  }

  updateParticles(game.particles, dtRender);
  render(alpha);
  updateHud();
}

function wireButtons() {
  const clickHandlers = [
    ["start-button", () => { audio.unlock(); audio.playButtonClick(); startCampaign(); }],
    ["next-level-button", () => {
      audio.playButtonClick();
      if (isFinalLevel(game.levelIndex)) {
        game.mode = "campaignComplete";
        screens.showCampaignResultsScreen({
          starsGathered: game.campaign.starsGathered,
          starsTotal: totalStarsInCampaign(),
          fuelRemainingTotal: game.fuelLeftTotal,
          wellsUsedTotal: game.campaign.wellsUsedTotal,
          totalScore: game.campaign.totalScore,
          flightSecondsTotal: game.campaign.flightSecondsTotal,
          levelsWon: game.campaign.levelsWon,
        });
      } else {
        loadLevel(game.levelIndex + 1);
        screens.hideAllScreens();
      }
    }],
    ["replay-level-button", () => { audio.playButtonClick(); restartLevel(); }],
    ["play-again-button", () => { audio.playButtonClick(); startCampaign(); }],
    ["retry-finale-button", () => {
      audio.playButtonClick();
      game.campaign = createCampaignState();
      game.fuelLeftTotal = 0;
      loadLevel(levelCount() - 1);
      screens.hideAllScreens();
    }],
    ["results-title-button", () => {
      audio.playButtonClick();
      game.mode = "title";
      loadLevel(0);
      game.mode = "title";
      screens.showTitleScreen();
    }],
    ["loss-retry-button", () => { audio.playButtonClick(); restartLevel(); }],
    ["loss-campaign-button", () => {
      audio.playButtonClick();
      game.campaign = createCampaignState();
      game.fuelLeftTotal = 0;
      loadLevel(0);
      game.mode = "title";
      screens.showTitleScreen();
    }],
    ["pause-resume-button", () => { audio.playButtonClick(); togglePause(); }],
    ["pause-restart-button", () => { audio.playButtonClick(); restartLevel(); }],
    ["pause-title-button", () => {
      audio.playButtonClick();
      loadLevel(game.levelIndex);
      game.mode = "title";
      screens.showTitleScreen();
    }],
    ["launch-button", () => { audio.unlock(); launchComet(); }],
    ["clear-wells-button", () => {
      if (game.mode !== "planning") return;
      game.wells = [];
      game.selectedIndex = -1;
      audio.playRemoveBlip();
      recomputePrediction();
    }],
    ["restart-button", () => { audio.playButtonClick(); restartLevel(); }],
    ["sound-button", () => { audio.unlock(); toggleMute(); }],
    ["pause-button", () => togglePause()],
  ];
  for (const [id, handler] of clickHandlers) {
    const element = document.getElementById(id);
    if (!element) continue;
    element.addEventListener("click", (event) => {
      event.currentTarget.blur();
      handler();
    });
  }
}

function wireInput() {
  attachPointerControls(canvas, {
    onPress(x, y, button) {
      audio.unlock();
      if (button === 2 || game.mode !== "planning") return;
      const near = nearestWellIndex(game.wells, x, y, 28);
      if (near >= 0) {
        game.draggingIndex = near;
        game.selectedIndex = near;
        return;
      }
      const placed = placeWell(game.wells, x, y, game.level.wells, game.level);
      if (placed) {
        game.wells = placed;
        game.draggingIndex = game.wells.length - 1;
        game.selectedIndex = game.draggingIndex;
        const well = game.wells[game.draggingIndex];
        spawnWellShockwave(game.particles, well.x, well.y);
        spawnFloatingText(game.particles, well.x, well.y - 26, "WELL PLACED", "#9beaff");
        audio.playPlaceBlip();
      } else {
        spawnFloatingText(game.particles, x, y - 18, "NO WELL HERE", "#ff8fa8");
        audio.playWarningBlip();
      }
      recomputePrediction();
    },
    onMove(x, y) {
      game.pointer = { x, y };
      if (game.mode !== "planning") return;
      game.ghost = { x, y };
      if (game.draggingIndex >= 0) {
        game.wells = moveWellTo(game.wells, game.draggingIndex, x, y, game.level);
      }
      recomputePrediction();
    },
    onRelease() {
      game.draggingIndex = -1;
    },
    onRightClick(x, y) {
      if (game.mode !== "planning") return;
      const next = removeWellNear(game.wells, x, y, 30);
      if (next.length !== game.wells.length) {
        game.wells = next;
        game.selectedIndex = -1;
        audio.playRemoveBlip();
        recomputePrediction();
      }
    },
    onLeave() {
      game.pointer = null;
      game.ghost = null;
      game.draggingIndex = -1;
    },
  });

  attachKeyboardControls({
    onLaunch: () => {
      audio.unlock();
      if (game.mode === "title") startCampaign();
      else launchComet();
    },
    onRestartLevel: () => {
      if (game.mode === "title" || game.mode === "campaignComplete") return;
      restartLevel();
    },
    onTogglePause: () => togglePause(),
    onToggleMute: () => toggleMute(),
    onRemoveWell: () => {
      if (game.mode !== "planning") return;
      if (game.wells.length === 0) return;
      game.wells = removeLastWell(game.wells);
      game.selectedIndex = -1;
      audio.playRemoveBlip();
      recomputePrediction();
    },
    onNudge(dx, dy, fine) {
      if (game.mode !== "planning" || game.wells.length === 0) return;
      const index = game.selectedIndex >= 0 ? game.selectedIndex : game.wells.length - 1;
      const step = fine ? 2 : 10;
      const well = game.wells[index];
      game.wells = moveWellTo(game.wells, index, well.x + dx * step, well.y + dy * step, game.level);
      game.selectedIndex = index;
      recomputePrediction();
    },
    onJumpToLevel: (levelIndex) => jumpToLevel(levelIndex),
  });
}

function applyShotStaging() {
  const staging = parseShotParams(window.location.search);
  if (!staging) return;
  document.body.classList.add("shot-mode");
  game.shot = staging;
  loadLevel(staging.levelIndex);
  game.wells = staging.wells.slice(0, game.level.wells);
  clearParticles(game.particles);

  if (staging.shot === "title") {
    game.mode = "title";
    game.wells = [];
    screens.showTitleScreen();
  } else if (staging.shot === "cover") {
    const advanced = advanceCometToStep(game.level, game.wells, staging.steps);
    game.comet = advanced.state;
    game.prevX = advanced.state.x;
    game.prevY = advanced.state.y;
    game.trail = advanced.trail;
    game.flightSeconds = advanced.flightSeconds;
    game.mode = "flying";
    game.campaign.totalScore = 1860;
    let combo = 0;
    for (let i = 0; i < game.level.stars.length; i += 1) {
      if (game.comet.collected[i]) {
        combo += 1;
        const star = game.level.stars[i];
        spawnStarBurst(game.particles, star.x, star.y, combo);
        spawnFloatingText(game.particles, star.x, star.y - 16, combo > 1 ? `+1 ★  COMBO ×${combo}` : "+1 ★", "#ffe9b0");
      }
    }
    for (const particle of game.particles.particles) particle.age = 0.28;
    for (const ring of game.particles.rings) ring.age = 0.2;
    for (const text of game.particles.texts) text.age = 0.3;
    spawnFloatingText(game.particles, game.comet.x, game.comet.y - 34, "SLINGSHOT!", "#9beaff");
    game.particles.texts[game.particles.texts.length - 1].age = 0.25;
    screens.hideAllScreens();
  } else if (staging.shot === "hazard") {
    game.mode = "planning";
    game.ghost = staging.ghost;
    game.comet = createCometState(game.level);
    if (staging.ghost) {
      spawnWellShockwave(game.particles, staging.ghost.x, staging.ghost.y);
      for (const ring of game.particles.rings) ring.age = 0.18;
      spawnFloatingText(game.particles, staging.ghost.x, staging.ghost.y - 30, "PLACE WELL", "#9beaff");
      game.particles.texts[0].age = 0.2;
    }
    screens.hideAllScreens();
  } else if (staging.shot === "results") {
    const advanced = advanceCometToStep(game.level, game.wells, 4000);
    game.comet = advanced.state;
    game.prevX = advanced.state.x;
    game.prevY = advanced.state.y;
    game.trail = advanced.trail;
    game.flightSeconds = advanced.flightSeconds;
    game.campaign.totalScore = stagedCampaignStats().totalScore;
    game.mode = "campaignComplete";
    screens.showCampaignResultsScreen(stagedCampaignStats());
  } else if (staging.shot === "levelwin") {
    game.mode = "levelComplete";
    screens.showLevelCompleteScreen({
      levelName: game.level.name,
      isFinal: false,
      starsCollected: game.level.stars.length,
      starsTotal: game.level.stars.length,
      fuelRemaining: 6.4,
      wellsUsed: game.wells.length,
      wellsBudget: game.level.wells,
      levelScore: 640,
      flightSeconds: 8.2,
      totalScore: 1860,
    });
  } else if (staging.shot === "loss") {
    game.mode = "lost";
    screens.showLossScreen({
      title: "LOST TO THE BLACK HOLE",
      reason: "The comet was captured by a black hole.",
      starsCollected: 1,
      starsTotal: game.level.stars.length,
      fuelRemaining: 4.2,
      wellsUsed: game.wells.length,
      wellsBudget: game.level.wells,
      hint: "Hint: bend the path wider around the black hole — skim it, never touch it.",
    });
  }
  recomputePrediction();
  render(1);
  updateHud();
  window.__shotReady = true;
}

function exposeTestHooks() {
  window.__starShepherd = {
    getSnapshot() {
      return {
        mode: game.mode,
        levelIndex: game.levelIndex,
        starsCollected: game.comet.starsCollected,
        starsTotal: game.level.stars.length,
        fuel: game.comet.fuel,
        wellsPlaced: game.wells.length,
        score: game.campaign.totalScore,
        muted: game.muted,
        cometX: game.comet.x,
        cometY: game.comet.y,
        cometStatus: game.comet.status,
      };
    },
    startCampaign,
    launchComet,
    restartLevel,
    togglePause,
    toggleMute,
    jumpToLevel,
    setWells(wells) {
      game.wells = wells.slice(0, game.level.wells);
      recomputePrediction();
    },
    placeWellAt(x, y) {
      const placed = placeWell(game.wells, x, y, game.level.wells, game.level);
      if (placed) {
        game.wells = placed;
        recomputePrediction();
        return true;
      }
      return false;
    },
  };
}

fitStage();
window.addEventListener("resize", fitStage);
wireButtons();
wireInput();
loadLevel(0);
game.mode = "title";
screens.showTitleScreen();
hud.setSoundLabel(false);
recomputePrediction();
applyShotStaging();
exposeTestHooks();
requestAnimationFrame(tick);
