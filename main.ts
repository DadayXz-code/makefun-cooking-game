// main.ts — hands Dapur Kilat in for the make.fun cooking-game bounty.
// Node 22, standard library only, no network, no installs.
//
// What it does, in order:
//   1. Clears the output directory's contents (never the directory itself).
//   2. Copies this repository's game/ and screenshots/ into it.
//   3. Writes /output/dossier.json with buildDossier from the vendored
//      make.fun library, so the judge's view matches the files exactly.
// It runs twice in the grader and must write identical bytes both times:
// there is no timestamp, no randomness and no absolute path in the output.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Empty the output directory without removing the directory itself,
// so a stale file from an earlier run can never leak into the hand-in.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}

cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps, as the competition's kit states them: the dossier text
// is capped at 160 KiB, at most 4 screenshots of 256 KiB each, game/ at
// most 993 files and 48 MiB with paths under 1000 bytes.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

// A one-line summary on stdout (never into /output, so the two grader
// runs stay byte-identical): how much was handed in.
const gameCount = readdirSync(join(outputDir, 'game'), { recursive: true }).length;
const shotCount = readdirSync(join(outputDir, 'screenshots')).length;
console.log(`dapur-kilat: ${gameCount} game entries, ${shotCount} screenshots, dossier ${dossierBytes.length} bytes -> ${outputDir}`);
