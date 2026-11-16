// Screen controller for Star Shepherd — title, level-complete,
// campaign-results, loss, and pause overlays. Screens fade and rise
// with eased CSS transitions; this module only fills in the numbers
// and toggles which screen is open.

const SCREEN_IDS = [
  "screen-title",
  "screen-level",
  "screen-results",
  "screen-loss",
  "screen-pause",
];

export function createScreenController(documentRef) {
  function hideAllScreens() {
    for (const id of SCREEN_IDS) {
      const element = documentRef.getElementById(id);
      if (element) element.classList.remove("open");
    }
  }

  function openScreen(id) {
    hideAllScreens();
    const element = documentRef.getElementById(id);
    if (element) element.classList.add("open");
  }

  function setText(id, text) {
    const element = documentRef.getElementById(id);
    if (element) element.textContent = text;
  }

  return {
    hideAllScreens,
    showTitleScreen() {
      openScreen("screen-title");
    },
    showPauseOverlay(levelName) {
      setText("pause-level-name", levelName);
      openScreen("screen-pause");
    },
    showLevelCompleteScreen(details) {
      setText("level-complete-title", `LEVEL COMPLETE — ${details.levelName.toUpperCase()}`);
      setText("level-complete-line", details.isFinal
        ? "The last light is home. Thank you, shepherd."
        : "Thank you, shepherd — every star in this sky burns again.");
      setText("stat-level-stars", `${details.starsCollected}/${details.starsTotal}`);
      setText("stat-level-fuel", `${details.fuelRemaining.toFixed(1)}s`);
      setText("stat-level-wells", `${details.wellsUsed}/${details.wellsBudget}`);
      setText("stat-level-score", `${details.levelScore}`);
      setText("stat-level-time", `${details.flightSeconds.toFixed(1)}s`);
      setText("stat-level-total", `${details.totalScore}`);
      const nextButton = documentRef.getElementById("next-level-button");
      if (nextButton) nextButton.textContent = details.isFinal ? "SEE RESULTS ★" : "NEXT LEVEL →";
      openScreen("screen-level");
    },
    showCampaignResultsScreen(details) {
      setText("results-stars", `${details.starsGathered}/${details.starsTotal}`);
      setText("results-fuel", `${details.fuelRemainingTotal.toFixed(1)}s`);
      setText("results-wells", `${details.wellsUsedTotal}`);
      setText("results-score", `${details.totalScore}`);
      setText("results-time", `${details.flightSecondsTotal.toFixed(1)}s`);
      setText("results-levels", `${details.levelsWon}/10`);
      openScreen("screen-results");
    },
    showLossScreen(details) {
      setText("loss-title", details.title);
      setText("loss-reason", details.reason);
      setText("loss-stars", `${details.starsCollected}/${details.starsTotal}`);
      setText("loss-fuel", `${details.fuelRemaining.toFixed(1)}s`);
      setText("loss-wells", `${details.wellsUsed}/${details.wellsBudget}`);
      setText("loss-hint", details.hint);
      openScreen("screen-loss");
    },
  };
}
