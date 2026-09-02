"use strict";

/**
 * Downloads the small offline French Vosk model (~41 MB) into companion/models.
 * Runs once at install time; the model is then bundled by electron-builder.
 * This is the ONLY network call the Companion tooling makes at install time.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip";
const MODELS_DIR = path.join(__dirname, "..", "models");
const TARGET = path.join(MODELS_DIR, "vosk-model-small-fr");

if (fs.existsSync(path.join(TARGET, "am"))) {
  console.log("[companion] modèle vocal déjà présent");
  process.exit(0);
}

fs.mkdirSync(MODELS_DIR, { recursive: true });
const zipPath = path.join(MODELS_DIR, "model.zip");

try {
  console.log("[companion] téléchargement du modèle vocal local…");
  execFileSync("curl", ["-fsSL", MODEL_URL, "-o", zipPath], { stdio: "inherit" });
  execFileSync("unzip", ["-q", "-o", zipPath, "-d", MODELS_DIR], { stdio: "inherit" });
  const extracted = fs
    .readdirSync(MODELS_DIR)
    .find((entry) => entry.startsWith("vosk-model-small-fr-"));
  if (extracted) fs.renameSync(path.join(MODELS_DIR, extracted), TARGET);
  fs.unlinkSync(zipPath);
  console.log("[companion] modèle installé dans", TARGET);
} catch (error) {
  console.error(
    "[companion] téléchargement impossible. Télécharge manuellement",
    MODEL_URL,
    "et décompresse-le dans",
    TARGET,
  );
  console.error(error.message);
}
