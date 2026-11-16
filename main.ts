import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

async function copyTreeSorted(srcDir: string, dstDir: string): Promise<void> {
  await mkdir(dstDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const dstPath = join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await copyTreeSorted(srcPath, dstPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, dstPath);
    }
  }
}

await mkdir(outputDir, { recursive: true });

const existing = await readdir(outputDir);
existing.sort();
for (const name of existing) {
  await rm(join(outputDir, name), { recursive: true, force: true });
}

await copyTreeSorted(join(repoRoot, "game"), join(outputDir, "game"));
await copyTreeSorted(join(repoRoot, "screenshots"), join(outputDir, "screenshots"));

const dossier = await buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

const dossierPath = join(outputDir, "dossier.json");
await writeDossierBytes(dossierPath, dossier);

async function writeDossierBytes(path: string, dossier: unknown): Promise<void> {
  let bytes: Uint8Array;
  if (typeof dossier === "string") {
    bytes = new TextEncoder().encode(dossier);
  } else if (dossier instanceof Uint8Array) {
    bytes = dossier;
  } else if (dossier instanceof ArrayBuffer) {
    bytes = new Uint8Array(dossier);
  } else {
    bytes = new TextEncoder().encode(JSON.stringify(dossier));
  }
  if (bytes.length === 0) {
    throw new Error("buildDossier returned empty output; refusing to write an empty dossier.json");
  }
  await writeFile(path, bytes);
}
