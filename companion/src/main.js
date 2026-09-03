"use strict";

const path = require("node:path");
const crypto = require("node:crypto");
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, nativeImage } = require("electron");

const { ConfigStore } = require("./lib/config");
const { StreamncoApi, withRetries } = require("./lib/api");
const { CooldownGate } = require("./lib/cooldown");
const { VoskEngine } = require("./engine/voskEngine");

const HEARTBEAT_INTERVAL_MS = 20_000;
const VERSION = app.getVersion();

let mainWindow = null;
let tray = null;
let config = null;
let api = null;
let engine = null;
let heartbeatTimer = null;
let cooldown = new CooldownGate(5);

const state = {
  paired: false,
  backendOnline: false,
  listening: false,
  testMode: false,
  microphoneAvailable: true,
  microphoneLabel: null,
  keyword: "clip",
  enabled: false,
  clipsToday: 0,
  logs: [],
};

function log(level, message, fields = {}) {
  const entry = { at: new Date().toISOString(), level, message, ...fields };
  state.logs.unshift(entry);
  state.logs = state.logs.slice(0, 200);
  // Local debug log only — never contains tokens, audio or transcripts.
  console.log(`[companion] ${level} ${message}`, fields);
  pushState();
}

function pushState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state", state);
  }
  updateTray();
}

function notify(title, body) {
  if (!Notification.isSupported()) return;
  // Discreet, non-focus-stealing notification. Never a modal.
  new Notification({ title, body, silent: true }).show();
}

function modelPath() {
  const packaged = path.join(process.resourcesPath || "", "models", "vosk-model-small-fr");
  const local = path.join(__dirname, "..", "models", "vosk-model-small-fr");
  return app.isPackaged ? packaged : local;
}

function buildEngine() {
  const created = new VoskEngine({
    modelPath: modelPath(),
    keyword: state.keyword,
    confidenceThreshold: 0.75,
  });
  created.onStatus((status) => {
    if (status.state === "model_missing") {
      log("error", "Modèle vocal local absent (npm run postinstall)");
    }
    state.listening = status.state === "listening";
    pushState();
  });
  created.onCommand((event) => void handleCommand(event));
  return created;
}

/** One detection -> one voice_event_id -> at most one clip. */
async function handleCommand(event) {
  if (!cooldown.accept()) {
    log("info", "Commande ignorée (cooldown)", { remaining_ms: cooldown.remainingMs() });
    return;
  }

  if (state.testMode) {
    // Microphone test: report the detection, never call Twitch.
    log("info", "Test micro : commande détectée");
    await sendHeartbeat({ test_detected: true, test_keyword: event.keyword });
    notify("Streamnco", "Commande détectée — test réussi");
    return;
  }

  if (!state.enabled) {
    log("info", "Voice Clip désactivé côté Streamnco : commande ignorée");
    return;
  }

  const voiceEventId = crypto.randomUUID();
  log("info", "Commande détectée", { voice_event_id: voiceEventId, confidence: event.confidence });

  try {
    const { payload, status } = await withRetries(
      () =>
        api.trigger({
          voiceEventId, // same id on every retry => idempotent server-side
          keyword: event.keyword,
          confidence: event.confidence,
          detectedAt: event.detectedAt,
        }),
      { onRetry: (n) => log("warn", `Nouvel essai ${n} (même voice_event_id)`, { voice_event_id: voiceEventId }) },
    );

    if (payload?.ok && !payload.duplicate) {
      state.clipsToday += 1;
      log("info", "Clip sauvegardé", { voice_event_id: voiceEventId, twitch_clip_id: payload.twitch_clip_id });
      notify("Streamnco", "Clip sauvegardé");
      return;
    }
    if (payload?.duplicate) {
      log("info", "Événement déjà traité (aucun clip supplémentaire)", { voice_event_id: voiceEventId });
      return;
    }

    const code = payload?.error_code ?? `HTTP_${status}`;
    log("error", "Échec de la commande", { voice_event_id: voiceEventId, error_code: code });
    notify("Streamnco", errorMessage(code));
  } catch (error) {
    log("error", "Backend injoignable", { voice_event_id: voiceEventId, reason: error.message });
    notify("Streamnco", "Streamnco est injoignable. Le clip n'a pas pu être créé.");
  }
}

function errorMessage(code) {
  switch (code) {
    case "STREAM_OFFLINE":
      return "Aucun live actif détecté";
    case "TWITCH_SCOPE_MISSING":
      return "Autorisation Twitch requise";
    case "TWITCH_TOKEN_EXPIRED":
    case "TWITCH_REAUTH_REQUIRED":
      return "Reconnecte Twitch";
    case "TWITCH_CLIP_NOT_READY":
      return "Twitch n'a pas fini de préparer le clip";
    case "VOICE_EVENT_COOLDOWN":
      return "Commande trop rapprochée";
    case "COMPANION_UNAUTHORIZED":
      return "Companion non appairé";
    case "MICROPHONE_UNAVAILABLE":
      return "Microphone indisponible";
    default:
      return "Le clip n'a pas pu être créé";
  }
}

async function sendHeartbeat(extra = {}) {
  if (!api?.token) return null;
  try {
    const { ok, payload } = await api.heartbeat({
      microphone_label: state.microphoneLabel ?? undefined,
      microphone_available: state.microphoneAvailable,
      listening: state.listening,
      ...extra,
    });
    if (!ok) {
      state.backendOnline = false;
      log("error", "Heartbeat refusé", { error_code: payload?.error_code });
      pushState();
      return null;
    }
    state.backendOnline = true;
    const cfg = payload.config ?? {};
    const keywordChanged = cfg.keyword && cfg.keyword !== state.keyword;
    state.enabled = Boolean(cfg.enabled);
    state.keyword = cfg.keyword ?? state.keyword;
    state.testMode = Boolean(cfg.test_mode);
    cooldown.setSeconds(Number(cfg.cooldown_seconds ?? 5));
    if (engine) {
      engine.setConfidenceThreshold(Number(cfg.confidence_threshold ?? 0.75));
      if (keywordChanged) engine.setKeyword(state.keyword);
    }
    pushState();
    return payload;
  } catch (error) {
    state.backendOnline = false;
    log("warn", "Heartbeat impossible (réseau)", { reason: error.message });
    pushState();
    return null;
  }
}

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  void sendHeartbeat();
  heartbeatTimer = setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
}

function updateTray() {
  if (!tray) return;
  const listening = state.listening && state.enabled ? "Listening" : "Paused";
  tray.setToolTip(`Streamnco — Voice Clip: ${listening}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Companion: ${state.backendOnline ? "Connected" : "Offline"}`, enabled: false },
      { label: `Voice Clip: ${listening}`, enabled: false },
      { type: "separator" },
      { label: "Ouvrir Streamnco", click: () => shell.openExternal("https://streamnco.com/voice-clip") },
      {
        label: state.listening ? "Mettre Voice Clip en pause" : "Reprendre Voice Clip",
        click: () => mainWindow?.webContents.send("toggle-listening"),
      },
      { label: "Réglages", click: () => showWindow() },
      { type: "separator" },
      { label: "Quitter", click: () => app.quit() },
    ]),
  );
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    resizable: false,
    title: "Streamnco Companion",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.on("close", (event) => {
    // Keep listening in the tray instead of quitting.
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.webContents.on("did-finish-load", () => pushState());
}

app.whenReady().then(() => {
  config = new ConfigStore(app.getPath("userData"));
  state.paired = Boolean(config.data.companionToken);
  state.microphoneLabel = config.data.deviceLabel ?? null;
  api = new StreamncoApi({ token: config.data.companionToken, version: VERSION });
  engine = buildEngine();

  tray = new Tray(nativeImage.createEmpty());
  updateTray();
  tray.on("click", () => showWindow());

  showWindow();
  if (state.paired) startHeartbeat();
});

app.on("before-quit", () => {
  app.isQuiting = true;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  void engine?.stop();
});

app.on("window-all-closed", (event) => event.preventDefault());

// ── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle("get-state", () => state);

ipcMain.handle("pair", async (_event, token) => {
  const clean = String(token ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return { ok: false, error: "Code d'appairage invalide." };
  }
  api.setToken(clean);
  const payload = await sendHeartbeat();
  if (!payload) {
    api.setToken(config.data.companionToken);
    return { ok: false, error: "Appairage refusé par Streamnco." };
  }
  config.set({ companionToken: clean });
  state.paired = true;
  startHeartbeat();
  log("info", "Companion appairé");
  return { ok: true };
});

ipcMain.handle("set-device", async (_event, { deviceId, label }) => {
  config.set({ deviceId, deviceLabel: label ?? null });
  state.microphoneLabel = label ?? null;
  state.microphoneAvailable = true;
  await engine.setDevice(deviceId);
  log("info", "Microphone sélectionné", { device: label });
  void sendHeartbeat();
  return { ok: true };
});

ipcMain.handle("set-auto-start", (_event, enabled) => {
  config.set({ autoStart: Boolean(enabled) });
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true });
  return { ok: true };
});

ipcMain.handle("start-engine", async () => {
  try {
    await engine.start();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("stop-engine", async () => {
  await engine.stop();
  return { ok: true };
});

// Raw PCM16 chunks from the selected microphone. They are consumed in-process
// by the local recognizer and never leave the machine.
ipcMain.on("audio-chunk", (_event, buffer) => {
  engine?.pushAudio(Buffer.from(buffer));
});

ipcMain.on("microphone-unavailable", (_event, reason) => {
  state.microphoneAvailable = false;
  state.listening = false;
  log("error", "Microphone indisponible", { reason });
  notify("Streamnco", "Microphone indisponible");
  void sendHeartbeat();
});
