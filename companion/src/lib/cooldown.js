"use strict";

/**
 * Local cooldown gate. A valid command starts a cooldown window; anything said
 * inside it is ignored. Outside it, the streamer can clip as often as they want.
 */
class CooldownGate {
  constructor(seconds) {
    this.seconds = Number(seconds) || 5;
    this.lastAcceptedAt = 0;
  }

  setSeconds(seconds) {
    if (Number.isFinite(seconds) && seconds >= 0) this.seconds = seconds;
  }

  /** Returns true when the command is accepted (and starts a new window). */
  accept(now = Date.now()) {
    if (this.lastAcceptedAt && now - this.lastAcceptedAt < this.seconds * 1000) {
      return false;
    }
    this.lastAcceptedAt = now;
    return true;
  }

  remainingMs(now = Date.now()) {
    if (!this.lastAcceptedAt) return 0;
    return Math.max(0, this.seconds * 1000 - (now - this.lastAcceptedAt));
  }
}

module.exports = { CooldownGate };
