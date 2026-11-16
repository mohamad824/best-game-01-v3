// WebAudio synthesis for Star Shepherd — every sound is generated,
// no audio files and no network. A rising arpeggio rewards star combos,
// and a low drone warns as the comet nears a black hole.

export function createShepherdAudio() {
  let context = null;
  let masterGain = null;
  let muted = false;
  let droneOscillator = null;
  let droneGain = null;

  function ensureContext() {
    if (context) {
      if (context.state === "suspended") context.resume();
      return context;
    }
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    masterGain = context.createGain();
    masterGain.gain.value = muted ? 0 : 0.55;
    masterGain.connect(context.destination);
    return context;
  }

  function tone(frequency, startOffset, duration, type, volume, slideTo) {
    const ctx = ensureContext();
    if (!ctx || !masterGain) return;
    const start = ctx.currentTime + startOffset;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noiseBurst(startOffset, duration, volume) {
    const ctx = ensureContext();
    if (!ctx || !masterGain) return;
    const start = ctx.currentTime + startOffset;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(start);
  }

  return {
    unlock() {
      ensureContext();
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (masterGain && context) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.55, context.currentTime, 0.02);
      }
    },
    isMuted() {
      return muted;
    },
    playButtonClick() {
      tone(660, 0, 0.08, "sine", 0.25);
    },
    playPlaceBlip() {
      tone(520, 0, 0.12, "sine", 0.35, 880);
      tone(1040, 0.03, 0.1, "sine", 0.18);
    },
    playRemoveBlip() {
      tone(420, 0, 0.1, "sine", 0.25, 240);
    },
    playCollectChime(combo) {
      const base = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const step = Math.min(combo, base.length - 1);
      tone(base[step], 0, 0.28, "sine", 0.4);
      tone(base[step] * 1.5, 0.05, 0.3, "sine", 0.25);
      tone(base[step] * 2, 0.1, 0.22, "triangle", 0.14);
    },
    playLaunchWhoosh() {
      noiseBurst(0, 0.55, 0.3);
      tone(180, 0, 0.5, "sine", 0.3, 520);
    },
    playWinFanfare() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((note, i) => tone(note, i * 0.11, 0.42, "triangle", 0.34));
      tone(261.63, 0, 0.8, "sine", 0.2);
    },
    playLossTone() {
      tone(320, 0, 0.5, "sine", 0.3, 140);
      tone(160, 0.12, 0.6, "triangle", 0.22, 70);
    },
    playWarningBlip() {
      tone(880, 0, 0.09, "square", 0.08);
      tone(880, 0.14, 0.09, "square", 0.08);
    },
    updateProximityDrone(clearance, flying) {
      const ctx = ensureContext();
      if (!ctx || !masterGain) return;
      const near = flying && clearance !== Infinity && clearance < 150;
      if (!near) {
        if (droneGain) droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }
      if (!droneOscillator) {
        droneOscillator = ctx.createOscillator();
        droneOscillator.type = "sawtooth";
        droneOscillator.frequency.value = 55;
        droneGain = ctx.createGain();
        droneGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 220;
        droneOscillator.connect(filter);
        filter.connect(droneGain);
        droneGain.connect(masterGain);
        droneOscillator.start();
      }
      const closeness = 1 - Math.max(0, clearance) / 150;
      droneGain.gain.setTargetAtTime(0.05 + closeness * 0.12, ctx.currentTime, 0.08);
      droneOscillator.frequency.setTargetAtTime(55 + closeness * 40, ctx.currentTime, 0.08);
    },
    stopDrone() {
      if (droneGain && context) {
        droneGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      }
    },
  };
}
