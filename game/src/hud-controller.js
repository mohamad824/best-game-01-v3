// HUD controller for Star Shepherd — keeps the on-screen readouts
// (level, stars, fuel with numbers, wells, score, warnings) in sync
// with the game state. DOM only; the simulation never reads the HUD.

import { OBJECTIVE_LINE } from "./config.js";

export function createHudController(documentRef) {
  const elements = {
    levelBadge: documentRef.getElementById("hud-level"),
    levelName: documentRef.getElementById("hud-level-name"),
    levelBriefing: documentRef.getElementById("hud-briefing"),
    stars: documentRef.getElementById("hud-stars"),
    fuelText: documentRef.getElementById("hud-fuel-text"),
    fuelFill: documentRef.getElementById("hud-fuel-fill"),
    fuelWrap: documentRef.getElementById("hud-fuel-bar"),
    wells: documentRef.getElementById("hud-wells"),
    score: documentRef.getElementById("hud-score"),
    warning: documentRef.getElementById("hud-warning"),
    objective: documentRef.getElementById("hud-objective"),
    soundButton: documentRef.getElementById("sound-button"),
    pauseButton: documentRef.getElementById("pause-button"),
    launchButton: documentRef.getElementById("launch-button"),
    clearButton: documentRef.getElementById("clear-wells-button"),
    restartButton: documentRef.getElementById("restart-button"),
  };
  if (elements.objective) elements.objective.textContent = OBJECTIVE_LINE;

  function setText(element, text) {
    if (element && element.textContent !== text) element.textContent = text;
  }

  return {
    elements,
    updateHudDisplay(snapshot) {
      setText(elements.levelBadge, `LEVEL ${snapshot.levelIndex + 1}/10`);
      setText(elements.levelName, snapshot.levelName);
      setText(elements.levelBriefing, snapshot.briefing);
      setText(elements.stars, `★ ${snapshot.starsCollected}/${snapshot.starsTotal}`);
      setText(elements.fuelText, `${snapshot.fuel.toFixed(1)}s / ${snapshot.fuelMax.toFixed(1)}s`);
      const fuelFraction = Math.max(0, snapshot.fuel / snapshot.fuelMax);
      if (elements.fuelFill) {
        elements.fuelFill.style.width = `${Math.round(fuelFraction * 100)}%`;
      }
      if (elements.fuelWrap) {
        elements.fuelWrap.classList.toggle("fuel-low", fuelFraction < 0.25);
      }
      const wellPips = "◉".repeat(snapshot.wellsPlaced) + "○".repeat(snapshot.wellsRemaining);
      setText(elements.wells, `WELLS ${wellPips} ${snapshot.wellsRemaining} left`);
      setText(elements.score, `SCORE ${snapshot.score}`);
      if (elements.warning) {
        const warning = snapshot.warning;
        elements.warning.textContent = warning.text;
        elements.warning.className = `hud-warning warning-${warning.level}`;
      }
      if (elements.launchButton) {
        elements.launchButton.disabled = snapshot.mode !== "planning";
        elements.launchButton.textContent =
          snapshot.mode === "flying" ? "FLYING…" : "▶ LAUNCH";
      }
      if (elements.clearButton) elements.clearButton.disabled = snapshot.mode !== "planning";
      if (elements.restartButton) {
        elements.restartButton.disabled =
          snapshot.mode === "title" || snapshot.mode === "campaignComplete";
      }
    },
    setSoundLabel(muted) {
      setText(elements.soundButton, muted ? "🔇 MUTED" : "🔊 SOUND");
    },
    setPauseLabel(paused) {
      setText(elements.pauseButton, paused ? "▶ RESUME" : "⏸ PAUSE");
    },
  };
}
