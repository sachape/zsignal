"use strict";

/**
 * VoiceRecognitionEngine — swappable local speech backend.
 *
 * Contract:
 *   start(): Promise<void>
 *   stop(): Promise<void>
 *   setDevice(deviceId: string): Promise<void>
 *   onCommand(callback: ({ keyword, confidence, detectedAt, transcript }) => void): void
 *
 * All implementations MUST run fully offline. No implementation may send audio
 * or transcripts to any network endpoint.
 */
class VoiceRecognitionEngine {
  constructor() {
    this.listeners = [];
    this.statusListeners = [];
    this.deviceId = null;
    this.running = false;
  }

  async start() {
    throw new Error("not_implemented");
  }

  async stop() {
    throw new Error("not_implemented");
  }

  async setDevice(deviceId) {
    this.deviceId = deviceId;
  }

  onCommand(callback) {
    this.listeners.push(callback);
  }

  onStatus(callback) {
    this.statusListeners.push(callback);
  }

  emitCommand(event) {
    for (const listener of this.listeners) listener(event);
  }

  emitStatus(status) {
    for (const listener of this.statusListeners) listener(status);
  }
}

module.exports = { VoiceRecognitionEngine };
