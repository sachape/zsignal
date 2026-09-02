"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Minimal, explicit bridge. The renderer can push audio samples and read state;
// it has no access to Node, the filesystem or the network.
contextBridge.exposeInMainWorld("companion", {
  getState: () => ipcRenderer.invoke("get-state"),
  pair: (token) => ipcRenderer.invoke("pair", token),
  setDevice: (deviceId, label) => ipcRenderer.invoke("set-device", { deviceId, label }),
  setAutoStart: (enabled) => ipcRenderer.invoke("set-auto-start", enabled),
  startEngine: () => ipcRenderer.invoke("start-engine"),
  stopEngine: () => ipcRenderer.invoke("stop-engine"),
  sendAudio: (chunk) => ipcRenderer.send("audio-chunk", chunk),
  microphoneUnavailable: (reason) => ipcRenderer.send("microphone-unavailable", reason),
  onState: (callback) => ipcRenderer.on("state", (_e, state) => callback(state)),
  onToggleListening: (callback) => ipcRenderer.on("toggle-listening", () => callback()),
});
