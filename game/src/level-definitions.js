// Level definitions for Star Shepherd — ten fixed stages of rising challenge.
// One mechanic throughout: place gravity wells, bend the comet's path.
// New arrangements arrive stage by stage; nothing else is added.
// The final stage is the climactic capstone: past the Great Devourer,
// shepherding the last light home to reignite the home star.

export const LEVELS = [
  {
    name: "First Light",
    subtitle: "Learn to bend space",
    briefing: "The comet flies straight. Bend its path with a well to gather the stars.",
    seed: 1101,
    start: { x: 120, y: 360 },
    velocity: { x: 170, y: 0 },
    fuel: 16,
    wells: 2,
    stars: [
      { x: 430, y: 300 },
      { x: 660, y: 400 },
      { x: 900, y: 300 },
    ],
    blackHoles: [],
    voidZones: [],
  },
  {
    name: "Gentle Arc",
    subtitle: "Reach for the high stars",
    briefing: "The stars hang high above the flight line. Pull the comet upward.",
    seed: 1102,
    start: { x: 120, y: 430 },
    velocity: { x: 170, y: -8 },
    fuel: 16,
    wells: 2,
    stars: [
      { x: 390, y: 260 },
      { x: 650, y: 210 },
      { x: 920, y: 280 },
    ],
    blackHoles: [],
    voidZones: [],
  },
  {
    name: "The Long Bend",
    subtitle: "An S-curve through the dark",
    briefing: "Four stars weave above and below. Chain your wells into one long curve.",
    seed: 1103,
    start: { x: 120, y: 360 },
    velocity: { x: 165, y: 0 },
    fuel: 18,
    wells: 3,
    stars: [
      { x: 360, y: 280 },
      { x: 590, y: 445 },
      { x: 830, y: 280 },
      { x: 1060, y: 405 },
    ],
    blackHoles: [],
    voidZones: [],
  },
  {
    name: "High and Low",
    subtitle: "The stars are scattered wide",
    briefing: "Stars at the top and the bottom of the sky. One flight must gather them all.",
    seed: 1104,
    start: { x: 120, y: 360 },
    velocity: { x: 165, y: 0 },
    fuel: 18,
    wells: 3,
    stars: [
      { x: 420, y: 240 },
      { x: 700, y: 480 },
      { x: 1010, y: 260 },
    ],
    blackHoles: [],
    voidZones: [],
  },
  {
    name: "Slingshot Pass",
    subtitle: "First black hole",
    briefing: "A black hole sits on the flight line. Skim it for speed — touch it and the light is lost.",
    seed: 1105,
    start: { x: 120, y: 360 },
    velocity: { x: 175, y: 0 },
    fuel: 16,
    wells: 2,
    stars: [
      { x: 510, y: 235 },
      { x: 790, y: 235 },
      { x: 1030, y: 360 },
    ],
    blackHoles: [{ x: 640, y: 360, captureRadius: 24, strength: 3600000 }],
    voidZones: [],
  },
  {
    name: "Edge of the Maw",
    subtitle: "Thread the near miss",
    briefing: "The stars arc around the maw. Bend close enough to whip around it, never into it.",
    seed: 1106,
    start: { x: 120, y: 400 },
    velocity: { x: 170, y: 0 },
    fuel: 18,
    wells: 3,
    stars: [
      { x: 450, y: 210 },
      { x: 860, y: 190 },
      { x: 1080, y: 390 },
    ],
    blackHoles: [{ x: 700, y: 310, captureRadius: 24, strength: 3600000 }],
    voidZones: [],
  },
  {
    name: "The Hollow",
    subtitle: "First void zone",
    briefing: "A void zone swallows the middle of the sky. Void zones destroy the comet — fly around.",
    seed: 1107,
    start: { x: 120, y: 360 },
    velocity: { x: 170, y: 0 },
    fuel: 18,
    wells: 3,
    stars: [
      { x: 420, y: 235 },
      { x: 860, y: 235 },
      { x: 1080, y: 430 },
    ],
    blackHoles: [],
    voidZones: [{ x: 640, y: 360, radius: 72 }],
  },
  {
    name: "Twin Voids",
    subtitle: "Weave the empty places",
    briefing: "Two voids guard the sky. Thread between them and gather every star.",
    seed: 1108,
    start: { x: 120, y: 360 },
    velocity: { x: 168, y: 0 },
    fuel: 18,
    wells: 3,
    stars: [
      { x: 380, y: 490 },
      { x: 680, y: 195 },
      { x: 1030, y: 300 },
    ],
    blackHoles: [],
    voidZones: [
      { x: 480, y: 270, radius: 58 },
      { x: 820, y: 450, radius: 58 },
    ],
  },
  {
    name: "Tight Fuel",
    subtitle: "Every drop of light counts",
    briefing: "The fuel budget is brutally tight. The shortest true curve wins — no wasted loops.",
    seed: 1109,
    start: { x: 120, y: 360 },
    velocity: { x: 195, y: 0 },
    fuel: 12,
    wells: 3,
    stars: [
      { x: 400, y: 290 },
      { x: 700, y: 400 },
      { x: 1000, y: 290 },
    ],
    blackHoles: [],
    voidZones: [],
  },
  {
    name: "The Great Devourer",
    subtitle: "Homecoming — the final shepherding",
    briefing:
      "The supermassive Great Devourer guards the way home. Shepherd the last light past it and reignite the home star.",
    seed: 1110,
    start: { x: 120, y: 360 },
    velocity: { x: 170, y: 0 },
    fuel: 20,
    wells: 3,
    stars: [
      { x: 400, y: 230 },
      { x: 620, y: 175 },
      { x: 940, y: 220 },
      { x: 1060, y: 330 },
      { x: 1150, y: 470, home: true },
    ],
    blackHoles: [
      { x: 770, y: 360, captureRadius: 36, strength: 6200000, title: "The Great Devourer" },
    ],
    voidZones: [{ x: 480, y: 520, radius: 55 }],
  },
];

export function getLevel(levelIndex) {
  return LEVELS[levelIndex];
}

export function totalStarsInCampaign() {
  return LEVELS.reduce((sum, level) => sum + level.stars.length, 0);
}

export function levelCount() {
  return LEVELS.length;
}
