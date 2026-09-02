"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { VoiceRecognitionEngine } = require("./VoiceRecognitionEngine");
const { matchesKeyword } = require("../lib/keyword");

/**
 * Local keyword spotting with Vosk (offline, ~40 MB small French model).
 *
 * Audio path: the renderer captures the SELECTED microphone with getUserMedia
 * + an AudioWorklet, downsamples to 16 kHz mono PCM16 and pushes chunks to the
 * main process over IPC. Nothing is written to disk and nothing is sent over
 * the network — this engine is the only consumer of the samples.
 *
 * Vosk runs with a restricted grammar (the keyword + [unk]) which keeps CPU low
 * and drastically reduces false positives compared to free-form transcription.
 */
class VoskEngine extends VoiceRecognitionEngine {
  constructor({ modelPath, keyword, confidenceThreshold = 0.75, sampleRate = 16000 }) {
    super();
    this.modelPath = modelPath;
    this.keyword = keyword || "clip";
    this.confidenceThreshold = confidenceThreshold;
    this.sampleRate = sampleRate;
    this.model = null;
    this.recognizer = null;
    this.vosk = null;
  }

  static isModelAvailable(modelPath) {
    try {
      return fs.existsSync(path.join(modelPath, "am"));
    } catch {
      return false;
    }
  }

  setKeyword(keyword) {
    this.keyword = keyword || "clip";
    if (this.running) {
      void this.stop().then(() => this.start());
    }
  }

  setConfidenceThreshold(value) {
    if (Number.isFinite(value)) this.confidenceThreshold = value;
  }

  async start() {
    if (this.running) return;
    if (!VoskEngine.isModelAvailable(this.modelPath)) {
      this.emitStatus({ state: "model_missing" });
      throw new Error("VOSK_MODEL_MISSING");
    }
    // Loaded lazily so the app still boots when the native module is absent.
    this.vosk = require("vosk");
    this.vosk.setLogLevel(-1);
    this.model = new this.vosk.Model(this.modelPath);
    // Restricted grammar => keyword spotting instead of open transcription.
    this.recognizer = new this.vosk.Recognizer({
      model: this.model,
      sampleRate: this.sampleRate,
      grammar: JSON.stringify([this.keyword, "[unk]"]),
    });
    this.recognizer.setWords(true);
    this.running = true;
    this.emitStatus({ state: "listening", keyword: this.keyword });
  }

  /** Feed raw PCM16 mono samples (Buffer) coming from the selected microphone. */
  pushAudio(chunk) {
    if (!this.running || !this.recognizer) return;
    let result = null;
    if (this.recognizer.acceptWaveform(chunk)) {
      result = this.recognizer.result();
    }
    if (!result) return;

    const transcript = String(result.text ?? "");
    if (!transcript) return;

    // Word-boundary match on the isolated word — never `includes("clip")`.
    if (!matchesKeyword(transcript, this.keyword)) return;

    const words = Array.isArray(result.result) ? result.result : [];
    const hit = words.find((w) => matchesKeyword(String(w.word ?? ""), this.keyword));
    const confidence = hit && Number.isFinite(hit.conf) ? hit.conf : 1;
    if (confidence < this.confidenceThreshold) {
      this.emitStatus({ state: "low_confidence", confidence });
      return;
    }

    this.emitCommand({
      keyword: this.keyword,
      confidence,
      detectedAt: new Date().toISOString(),
      transcript, // local only — never sent to the backend
    });
  }

  async stop() {
    this.running = false;
    try {
      this.recognizer?.free();
      this.model?.free();
    } catch {
      /* ignore */
    }
    this.recognizer = null;
    this.model = null;
    this.emitStatus({ state: "stopped" });
  }
}

module.exports = { VoskEngine };
