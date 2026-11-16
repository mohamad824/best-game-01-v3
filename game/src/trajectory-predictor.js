// Trajectory prediction for Star Shepherd.
// The predictor runs the exact same stepComet as the live flight, so the
// dotted path the shepherd sees is precisely where the comet will go.
// It also reports the outcome the path leads to, which drives the
// on-screen hazard warning.

import { BLACK_HOLE_WARNING_DISTANCE } from "./config.js";
import { simulateFlight } from "./comet-physics.js";

export function predictTrajectoryPath(level, wells, fromState) {
  const result = simulateFlight(level, wells, fromState);
  const points = result.trajectory;
  const wouldCollect = result.collected
    .map((flag, index) => (flag ? index : -1))
    .filter((index) => index >= 0);
  const nearBlackHole =
    result.minBlackHoleClearance !== Infinity &&
    result.minBlackHoleClearance < BLACK_HOLE_WARNING_DISTANCE;
  const outcome = {
    status: result.status,
    lossReason: result.lossReason,
    starsCollected: result.starsCollected,
    starsTotal: result.starsTotal,
    fuelRemaining: result.fuelRemaining,
    wouldCollect,
    nearBlackHole,
    minBlackHoleClearance: result.minBlackHoleClearance,
    minVoidClearance: result.minVoidClearance,
  };
  return { points, outcome, endX: result.endX, endY: result.endY };
}

export function predictHazardWarning(level, wells, fromState) {
  const prediction = predictTrajectoryPath(level, wells, fromState);
  if (prediction.outcome.lossReason === "blackhole") {
    return { level: "danger", text: "PATH ENDS IN A BLACK HOLE" };
  }
  if (prediction.outcome.lossReason === "void") {
    return { level: "danger", text: "PATH CROSSES A VOID ZONE" };
  }
  if (prediction.outcome.nearBlackHole) {
    return { level: "caution", text: "SLINGSHOT — SKIMMING A BLACK HOLE" };
  }
  if (prediction.outcome.status === "won") {
    return { level: "good", text: "PATH GATHERS EVERY STAR" };
  }
  return { level: "none", text: "" };
}
