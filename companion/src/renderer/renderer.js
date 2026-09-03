"use strict";

/**
 * Renderer: microphone enumeration, capture of the SELECTED device only, and
 * downsampling to 16 kHz mono PCM16 for the local recognizer in the main
 * process. It never captures desktop/system audio, and no audio ever reaches
 * the network — there is no fetch/WebSocket/FormData/MediaRecorder here.
 */

const el = (id) => document.getElementById(id);
let stream = null;
let audioContext = null;
let processor = null;
let source = null;
let listening = false;

async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === "audioinput");
  const select = el("device");
  const previous = select.value;
  select.innerHTML = "";
  for (const device of inputs) {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || "Microphone";
    select.appendChild(option);
  }
  if (previous && inputs.some((d) => d.deviceId === previous)) select.value = previous;
  return inputs;
}

function downsampleToPcm16(input, inputRate, targetRate = 16000) {
  const ratio = inputRate / targetRate;
  const length = Math.floor(input.length / ratio);
  const output = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const sample = input[Math.floor(i * ratio)];
    const clamped = Math.max(-1, Math.min(1, sample));
    output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return output;
}

async function startListening() {
  const deviceId = el("device").value;
  const label = el("device").selectedOptions[0]?.textContent ?? null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (error) {
    window.companion.microphoneUnavailable(error.name || "unknown");
    return;
  }

  // A USB mic unplugged mid-session ends the track: report, never crash.
  stream.getAudioTracks().forEach((track) => {
    track.addEventListener("ended", () => {
      void stopListening();
      window.companion.microphoneUnavailable("device_removed");
      void listDevices();
    });
  });

  await window.companion.setDevice(deviceId, label);
  const engineStart = await window.companion.startEngine();
  if (!engineStart.ok) {
    appendLog(`Moteur vocal indisponible : ${engineStart.error}`);
    await stopListening();
    return;
  }

  audioContext = new AudioContext();
  source = audioContext.createMediaStreamSource(stream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (event) => {
    const pcm = downsampleToPcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
    window.companion.sendAudio(pcm.buffer);
  };
  source.connect(processor);
  processor.connect(audioContext.destination);
  listening = true;
  el("toggle").textContent = "Arrêter l'écoute";
}

async function stopListening() {
  listening = false;
  processor?.disconnect();
  source?.disconnect();
  await audioContext?.close().catch(() => {});
  stream?.getTracks().forEach((track) => track.stop());
  processor = null;
  source = null;
  audioContext = null;
  stream = null;
  await window.companion.stopEngine();
  el("toggle").textContent = "Démarrer l'écoute";
}

function appendLog(text) {
  const log = el("log");
  const line = document.createElement("div");
  line.textContent = `${new Date().toLocaleTimeString("fr-FR")} — ${text}`;
  log.prepend(line);
}

function render(state) {
  el("status").textContent = state.backendOnline ? "Connected" : "Offline";
  el("dot-backend").className = `dot${state.backendOnline ? " on" : ""}`;
  el("mic").textContent = state.microphoneAvailable
    ? state.microphoneLabel || "—"
    : "Microphone unavailable";
  const isListening = state.listening && (state.enabled || state.testMode);
  el("listening").textContent = isListening ? "Listening" : "Paused";
  el("dot-listen").className = `dot${isListening ? " on" : ""}`;
  el("keyword").textContent = `« ${state.keyword} »`;
  el("pairing").style.display = state.paired ? "none" : "block";
  el("log").replaceChildren(
    ...state.logs.map((entry) => {
      const line = document.createElement("div");
      line.textContent = `${new Date(entry.at).toLocaleTimeString("fr-FR")} — ${entry.message}`;
      return line;
    }),
  );
}

window.companion.onState(render);
window.companion.onToggleListening(() => (listening ? void stopListening() : void startListening()));

el("pair").addEventListener("click", async () => {
  const result = await window.companion.pair(el("token").value);
  appendLog(result.ok ? "Companion appairé." : result.error);
});

el("toggle").addEventListener("click", () => (listening ? void stopListening() : void startListening()));
el("device").addEventListener("change", async () => {
  // Immediate switch: restart the capture on the newly selected device.
  if (listening) {
    await stopListening();
    await startListening();
  } else {
    await window.companion.setDevice(el("device").value, el("device").selectedOptions[0]?.textContent);
  }
});
el("autostart").addEventListener("change", (event) => window.companion.setAutoStart(event.target.checked));
navigator.mediaDevices.addEventListener("devicechange", () => void listDevices());

(async () => {
  // Permission prompt first so device labels are readable.
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((track) => track.stop());
  } catch (error) {
    window.companion.microphoneUnavailable(error.name || "unknown");
  }
  await listDevices();
  const initialState = await window.companion.getState();
  render(initialState);
  // A paired Companion must listen on its own: launching it (including at
  // login, hidden in the tray) is what the streamer considers "ready".
  if (initialState.paired && !listening) await startListening();
})();
