"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Tiny JSON config store in the Electron userData directory.
 * Holds the Streamnco pairing token and the selected microphone — never a
 * Twitch token (the Companion must never see one).
 */
class ConfigStore {
  constructor(directory) {
    this.file = path.join(directory, "companion-config.json");
    this.data = { companionToken: null, deviceId: null, deviceLabel: null, autoStart: false };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      this.data = { ...this.data, ...JSON.parse(raw) };
    } catch {
      /* first run */
    }
    return this.data;
  }

  set(patch) {
    this.data = { ...this.data, ...patch };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), "utf8");
    } catch (error) {
      // Config persistence must never crash the Companion.
      console.error("[companion] config write failed:", error.message);
    }
    return this.data;
  }
}

module.exports = { ConfigStore };
