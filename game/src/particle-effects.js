// Particle effects for Star Shepherd — star bursts, well shockwaves,
// capture bursts, and floating feedback text. Visual only: particles
// use a seeded generator and render time, and never affect the sim.

import { createSeededRandom, seededRange } from "./seeded-random.js";
import { easeOutBack, easeOutCubic } from "./easing.js";

export function createParticleSystem(seed) {
  return {
    particles: [],
    rings: [],
    texts: [],
    random: createSeededRandom(seed * 331 + 7),
  };
}

export function clearParticles(system) {
  system.particles.length = 0;
  system.rings.length = 0;
  system.texts.length = 0;
}

export function spawnStarBurst(system, x, y, combo) {
  const count = 24 + combo * 4;
  for (let i = 0; i < count; i += 1) {
    const angle = system.random() * Math.PI * 2;
    const speed = seededRange(system.random, 40, 190);
    system.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: seededRange(system.random, 0.55, 1.1),
      size: seededRange(system.random, 1.6, 4.2),
      color: system.random() < 0.5 ? "#ffd76a" : "#fff6d8",
    });
  }
  system.rings.push({ x, y, age: 0, life: 0.55, maxRadius: 52, color: "#ffd76a" });
}

export function spawnWellShockwave(system, x, y) {
  system.rings.push({ x, y, age: 0, life: 0.5, maxRadius: 64, color: "#4de8ff" });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    system.particles.push({
      x,
      y,
      vx: Math.cos(angle) * 110,
      vy: Math.sin(angle) * 110,
      age: 0,
      life: 0.45,
      size: 2.4,
      color: "#4de8ff",
    });
  }
}

export function spawnCaptureBurst(system, x, y) {
  for (let i = 0; i < 30; i += 1) {
    const angle = system.random() * Math.PI * 2;
    const speed = seededRange(system.random, 30, 160);
    system.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: seededRange(system.random, 0.5, 0.9),
      size: seededRange(system.random, 1.6, 3.6),
      color: system.random() < 0.5 ? "#ff4fd8" : "#9b4dff",
    });
  }
  system.rings.push({ x, y, age: 0, life: 0.7, maxRadius: 78, color: "#ff4fd8" });
}

export function spawnFloatingText(system, x, y, text, color) {
  system.texts.push({ x, y, text, color: color || "#ffe9b0", age: 0, life: 1.15 });
}

export function updateParticles(system, dtSeconds) {
  for (const particle of system.particles) {
    particle.age += dtSeconds;
    particle.x += particle.vx * dtSeconds;
    particle.y += particle.vy * dtSeconds;
    particle.vx *= 1 - 2.1 * dtSeconds;
    particle.vy *= 1 - 2.1 * dtSeconds;
  }
  system.particles = system.particles.filter((p) => p.age < p.life);
  for (const ring of system.rings) ring.age += dtSeconds;
  system.rings = system.rings.filter((r) => r.age < r.life);
  for (const text of system.texts) text.age += dtSeconds;
  system.texts = system.texts.filter((t) => t.age < t.life);
}

export function drawParticles(ctx, system) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const particle of system.particles) {
    const fade = 1 - particle.age / particle.life;
    ctx.globalAlpha = fade;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * fade + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  for (const ring of system.rings) {
    const progress = ring.age / ring.life;
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3 * (1 - progress) + 0.5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, easeOutCubic(progress) * ring.maxRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  for (const text of system.texts) {
    const progress = text.age / text.life;
    const pop = easeOutBack(Math.min(1, progress * 3));
    const rise = easeOutCubic(progress) * 44;
    ctx.globalAlpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
    ctx.font = `700 ${Math.round(20 * pop + 6)}px system-ui, sans-serif`;
    ctx.fillStyle = text.color;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 6;
    ctx.fillText(text.text, text.x, text.y - rise);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
