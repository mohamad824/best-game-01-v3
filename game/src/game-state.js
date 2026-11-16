// Campaign and level state for Star Shepherd — pure logic, no DOM.
// Scoring: stars gathered, fuel left, and wells left unused. Flight time
// is counted in simulated seconds, never wall-clock seconds.

import {
  SCORE_FUEL_MULTIPLIER,
  SCORE_PER_STAR,
  SCORE_WELL_BONUS,
  SCORE_WIN_BONUS,
} from "./config.js";
import { levelCount, totalStarsInCampaign } from "./level-definitions.js";

export function createCampaignState() {
  return {
    levelIndex: 0,
    totalScore: 0,
    starsGathered: 0,
    wellsUsedTotal: 0,
    flightSecondsTotal: 0,
    levelsWon: 0,
    levelScores: [],
  };
}

export function scoreLevelResult(level, flightResult, wellsUsed, won) {
  const starScore = flightResult.starsCollected * SCORE_PER_STAR;
  const fuelScore = won ? Math.round(flightResult.fuelRemaining * SCORE_FUEL_MULTIPLIER) : 0;
  const wellScore = won ? (level.wells - wellsUsed) * SCORE_WELL_BONUS : 0;
  const winScore = won ? SCORE_WIN_BONUS : 0;
  return {
    starScore,
    fuelScore,
    wellScore,
    winScore,
    total: starScore + fuelScore + wellScore + winScore,
  };
}

export function recordLevelWin(campaign, level, flightResult, wellsUsed, flightSeconds) {
  const score = scoreLevelResult(level, flightResult, wellsUsed, true);
  campaign.totalScore += score.total;
  campaign.starsGathered += flightResult.starsCollected;
  campaign.wellsUsedTotal += wellsUsed;
  campaign.flightSecondsTotal += flightSeconds;
  campaign.levelsWon += 1;
  campaign.levelScores.push(score.total);
  return score;
}

export function recordLevelAttempt(campaign, flightSeconds) {
  campaign.flightSecondsTotal += flightSeconds;
}

export function isFinalLevel(levelIndex) {
  return levelIndex >= levelCount() - 1;
}

export function campaignProgressText(campaign) {
  return `${campaign.starsGathered}/${totalStarsInCampaign()} stars`;
}

export function lossReasonText(lossReason) {
  if (lossReason === "blackhole") return "The comet was captured by a black hole.";
  if (lossReason === "void") return "The comet entered a void zone and was destroyed.";
  if (lossReason === "drifted") return "The comet drifted beyond the starfield.";
  return "The fuel ran out before every star was gathered.";
}

export function lossReasonTitle(lossReason) {
  if (lossReason === "blackhole") return "LOST TO THE BLACK HOLE";
  if (lossReason === "void") return "LOST IN THE VOID";
  if (lossReason === "drifted") return "LOST IN THE DARK";
  return "OUT OF FUEL";
}
