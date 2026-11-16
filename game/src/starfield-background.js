// Starfield background for Star Shepherd — three parallax layers,
// nebula wisps, and dust motes, all generated from the level seed.
// Render-time animation only (twinkle and drift); nothing here feeds
// back into the simulation.

import { WORLD_HEIGHT, WORLD_WIDTH } from "./config.js";
import { createSeededRandom, seededRange } from "./seeded-random.js";

const STAR_TINTS = ["#ffffff", "#dfe8ff", "#ffe9b0", "#bfefff", "#ffd76a"];

export function createStarfield(seed) {
  const random = createSeededRandom(seed * 7919 + 13);
  const layers = [];
  const layerSpecs = [
    { count: 230, sizeMin: 0.6, sizeMax: 1.4, drift: 1.2, alpha: 0.75 },
    { count: 150, sizeMin: 1.0, sizeMax: 2.2, drift: 2.6, alpha: 0.9 },
    { count: 80, sizeMin: 1.6, sizeMax: 3.1, drift: 4.5, alpha: 1.0 },
  ];
  for (const spec of layerSpecs) {
    const stars = [];
    for (let i = 0; i < spec.count; i += 1) {
      stars.push({
        x: random() * WORLD_WIDTH,
        y: random() * WORLD_HEIGHT,
        size: seededRange(random, spec.sizeMin, spec.sizeMax),
        phase: random() * Math.PI * 2,
        twinkleSpeed: seededRange(random, 0.6, 2.2),
        tint: STAR_TINTS[Math.floor(random() * STAR_TINTS.length)],
      });
    }
    layers.push({ stars, drift: spec.drift, alpha: spec.alpha });
  }
  const nebulae = [];
  const nebulaColors = ["#4b2a7a", "#144d5e", "#5e1a5e", "#1a2a6e", "#3a1a5e"];
  for (let i = 0; i < 6; i += 1) {
    nebulae.push({
      x: random() * WORLD_WIDTH,
      y: random() * WORLD_HEIGHT,
      radius: seededRange(random, 190, 390),
      color: nebulaColors[i % nebulaColors.length],
      alpha: seededRange(random, 0.16, 0.3),
    });
  }
  const dust = [];
  for (let i = 0; i < 110; i += 1) {
    dust.push({
      x: random() * WORLD_WIDTH,
      y: random() * WORLD_HEIGHT,
      size: seededRange(random, 0.8, 2.4),
      phase: random() * Math.PI * 2,
    });
  }
  return { layers, nebulae, dust };
}

export function drawStarfieldBackground(ctx, starfield, renderTime, cometPosition) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, "#070718");
  gradient.addColorStop(0.55, "#0d0a2e");
  gradient.addColorStop(1, "#141038");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const nebula of starfield.nebulae) {
    const breathe = 1 + 0.04 * Math.sin(renderTime * 0.24 + nebula.x * 0.01);
    const glow = ctx.createRadialGradient(
      nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius * breathe,
    );
    glow.addColorStop(0, nebula.color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = nebula.alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nebula.x, nebula.y, nebula.radius * breathe, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  for (const layer of starfield.layers) {
    for (const star of layer.stars) {
      const driftedX = (star.x + renderTime * layer.drift) % WORLD_WIDTH;
      const twinkle = 0.72 + 0.28 * Math.sin(renderTime * star.twinkleSpeed + star.phase);
      ctx.globalAlpha = layer.alpha * twinkle;
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(driftedX, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.size > 2.4) {
        ctx.globalAlpha = layer.alpha * twinkle * 0.5;
        ctx.fillRect(driftedX - star.size * 2.2, star.y - 0.5, star.size * 4.4, 1);
        ctx.fillRect(driftedX - 0.5, star.y - star.size * 2.2, 1, star.size * 4.4);
      }
    }
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.fillStyle = "#8fa0e8";
  for (const mote of starfield.dust) {
    const shimmer = 0.25 + 0.2 * Math.sin(renderTime * 0.5 + mote.phase);
    ctx.globalAlpha = shimmer;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (cometPosition) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const spill = ctx.createRadialGradient(
      cometPosition.x, cometPosition.y, 0,
      cometPosition.x, cometPosition.y, 280,
    );
    spill.addColorStop(0, "rgba(255, 215, 106, 0.30)");
    spill.addColorStop(0.45, "rgba(255, 180, 80, 0.12)");
    spill.addColorStop(1, "rgba(255, 180, 80, 0)");
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.arc(cometPosition.x, cometPosition.y, 280, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  const vignette = ctx.createRadialGradient(
    WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_HEIGHT * 0.42,
    WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_HEIGHT * 0.95,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(2,2,10,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.restore();
}
