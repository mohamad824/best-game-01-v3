// Entity rendering for Star Shepherd — wells, stars, black holes,
// void zones, the comet, and the dotted predicted path. All canvas-drawn;
// no images, no network. The comet is the light source: its glow spills
// onto everything nearby.

import {
  COMET_DRAW_RADIUS,
  HOME_STAR_DRAW_RADIUS,
  STAR_DRAW_RADIUS,
  WELL_DRAW_RADIUS,
} from "./config.js";
import { vecLength } from "./vector-math.js";

export function drawPredictedPath(ctx, points, outcome, renderTime) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = "rgba(155, 234, 255, 0.30)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
  const marching = Math.floor(renderTime * 6) % 4;
  for (let i = 0; i < points.length; i += 1) {
    if ((i + marching) % 4 !== 0) continue;
    const progress = i / points.length;
    const point = points[i];
    const collectedAhead = outcome && outcome.status === "won";
    ctx.globalAlpha = 0.95 - progress * 0.5;
    ctx.fillStyle = collectedAhead && progress > 0.7 ? "#ffd76a" : "#9beaff";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const end = points[points.length - 1];
  ctx.save();
  ctx.strokeStyle = "rgba(155, 234, 255, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 7 + Math.sin(renderTime * 3) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawGravityWell(ctx, well, renderTime, isGhost) {
  const pulse = 1 + 0.07 * Math.sin(renderTime * 2.4 + well.x * 0.02);
  const radius = WELL_DRAW_RADIUS * pulse;
  ctx.save();
  if (isGhost) ctx.globalAlpha = 0.65;
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, radius * 3.1);
  glow.addColorStop(0, "rgba(77, 232, 255, 0.5)");
  glow.addColorStop(0.5, "rgba(77, 232, 255, 0.14)");
  glow.addColorStop(1, "rgba(77, 232, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(well.x, well.y, radius * 3.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.strokeStyle = "#4de8ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(well.x, well.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(77, 232, 255, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(well.x, well.y, radius * 1.55, 0, Math.PI * 2);
  ctx.stroke();

  for (let arm = 0; arm < 3; arm += 1) {
    const start = renderTime * 1.6 + (arm * Math.PI * 2) / 3;
    ctx.strokeStyle = "rgba(190, 250, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(well.x, well.y, radius * 0.62, start, start + Math.PI * 0.55);
    ctx.stroke();
  }
  ctx.fillStyle = "#e8fdff";
  ctx.beginPath();
  ctx.arc(well.x, well.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (isGhost) {
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(well.x, well.y, radius * 2.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawFourPointStar(ctx, x, y, radius, coreColor, glowColor) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.4);
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.quadraticCurveTo(x, y, x, y + radius);
  ctx.quadraticCurveTo(x, y, x - radius, y);
  ctx.quadraticCurveTo(x, y, x, y - radius);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCollectibleStar(ctx, star, collected, renderTime, index) {
  if (collected) return;
  const pulse = 1 + 0.12 * Math.sin(renderTime * 2.2 + index * 1.7);
  if (star.home) {
    const radius = HOME_STAR_DRAW_RADIUS * pulse;
    drawFourPointStar(ctx, star.x, star.y, radius, "#ffd76a", "rgba(255, 215, 106, 0.55)");
    ctx.save();
    ctx.strokeStyle = "rgba(255, 215, 106, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius * 1.7, renderTime * 0.5, renderTime * 0.5 + Math.PI * 1.4);
    ctx.stroke();
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOME STAR", star.x, star.y + radius + 22);
    ctx.restore();
    return;
  }
  const radius = STAR_DRAW_RADIUS * pulse;
  drawFourPointStar(ctx, star.x, star.y, radius, "#fff6d8", "rgba(255, 240, 190, 0.45)");
}

export function drawBlackHole(ctx, hole, renderTime) {
  const capture = hole.captureRadius || 24;
  const diskRadius = capture * 2.1;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, diskRadius * 1.6);
  halo.addColorStop(0, "rgba(155, 77, 255, 0.4)");
  halo.addColorStop(0.6, "rgba(255, 79, 216, 0.16)");
  halo.addColorStop(1, "rgba(255, 79, 216, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, diskRadius * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.translate(hole.x, hole.y);
  ctx.rotate(-0.35);
  ctx.scale(1, 0.42);
  const disk = ctx.createRadialGradient(0, 0, capture * 0.5, 0, 0, diskRadius);
  disk.addColorStop(0, "#ff4fd8");
  disk.addColorStop(0.45, "#9b4dff");
  disk.addColorStop(1, "rgba(155, 77, 255, 0)");
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.arc(0, 0, diskRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (let arm = 0; arm < 2; arm += 1) {
    const start = renderTime * 2.2 * (arm === 0 ? 1 : -1) + arm * Math.PI;
    ctx.strokeStyle = arm === 0 ? "rgba(255, 79, 216, 0.9)" : "rgba(255, 190, 240, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, capture * 1.35, start, start + Math.PI * 0.8);
    ctx.stroke();
  }
  ctx.fillStyle = "#020208";
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, capture * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, capture * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  if (hole.title) {
    ctx.fillStyle = "#ffb0ec";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hole.title.toUpperCase(), hole.x, hole.y - diskRadius - 12);
  }
  ctx.restore();
}

export function drawVoidZone(ctx, zone, renderTime) {
  const wobble = 1 + 0.03 * Math.sin(renderTime * 1.4 + zone.x * 0.03);
  const radius = zone.radius * wobble;
  ctx.save();
  ctx.fillStyle = "rgba(20, 4, 34, 0.92)";
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(155, 77, 255, 0.35)";
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(zone.x - radius + i * 18, zone.y - radius);
    ctx.lineTo(zone.x - radius + i * 18 + radius, zone.y + radius);
    ctx.stroke();
  }
  ctx.restore();
  const rimPulse = 0.6 + 0.4 * Math.sin(renderTime * 2.6);
  ctx.strokeStyle = `rgba(255, 79, 216, ${0.55 + rimPulse * 0.4})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -renderTime * 22;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ff8fe4";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("VOID", zone.x, zone.y - radius - 10);
  ctx.restore();
}

export function drawLaunchBeacon(ctx, level, renderTime) {
  const { x, y } = level.start;
  const pulse = 1 + 0.1 * Math.sin(renderTime * 2.8);
  ctx.save();
  ctx.strokeStyle = "rgba(255, 215, 106, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const speed = vecLength(level.velocity.x, level.velocity.y) || 1;
  const dirX = level.velocity.x / speed;
  const dirY = level.velocity.y / speed;
  const tipX = x + dirX * 52;
  const tipY = y + dirY * 52;
  ctx.strokeStyle = "#ffd76a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + dirX * 30, y + dirY * 30);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = "#ffd76a";
  ctx.beginPath();
  ctx.moveTo(tipX + dirX * 10, tipY + dirY * 10);
  ctx.lineTo(tipX - dirY * 6, tipY + dirX * 6);
  ctx.lineTo(tipX + dirY * 6, tipY - dirX * 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawCometWithTrail(ctx, cometX, cometY, vx, vy, trail, renderTime) {
  if (trail.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 1; i < trail.length; i += 1) {
      const progress = i / trail.length;
      ctx.strokeStyle = `rgba(255, ${Math.round(190 + 50 * progress)}, 106, ${0.22 + progress * 0.6})`;
      ctx.lineWidth = 2 + progress * 7;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  const speed = vecLength(vx, vy);
  const stretch = 1 + Math.min(0.9, speed / 620);
  const angle = Math.atan2(vy, vx);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(cometX, cometY, 0, cometX, cometY, 64);
  glow.addColorStop(0, "rgba(255, 246, 216, 0.95)");
  glow.addColorStop(0.25, "rgba(255, 215, 106, 0.55)");
  glow.addColorStop(1, "rgba(255, 180, 80, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cometX, cometY, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cometX, cometY);
  ctx.rotate(angle);
  ctx.scale(stretch, 1 / Math.sqrt(stretch));
  ctx.fillStyle = "#fff6d8";
  ctx.beginPath();
  ctx.arc(0, 0, COMET_DRAW_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(2, -1, COMET_DRAW_RADIUS * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 246, 216, 0.85)";
  ctx.lineWidth = 1.5;
  const rayLength = 20 + 4 * Math.sin(renderTime * 5);
  ctx.beginPath();
  ctx.moveTo(cometX - rayLength, cometY);
  ctx.lineTo(cometX + rayLength, cometY);
  ctx.moveTo(cometX, cometY - rayLength);
  ctx.lineTo(cometX, cometY + rayLength);
  ctx.stroke();
  ctx.restore();
}
