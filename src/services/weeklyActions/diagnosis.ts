// Layered diagnosis builder using the full signal bundle.

import type { SignalBundle } from "./types";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function buildDiagnosisFromBundle(
  s: SignalBundle,
  fallbackRationale: string,
): string {
  if (s.maturity_state === "setup") {
    return "Pas encore assez de signaux. Connecte Twitch et lance un premier live pour générer un plan plus précis.";
  }
  if (s.maturity_state === "inactive") {
    return "Ton enjeu principal est de reprendre une régularité minimale avant d'optimiser le contenu.";
  }
  if (s.channel_updates_count_14d >= 3) {
    return "Tes changements récents de titre ou de catégorie indiquent que ton positionnement mérite d'être stabilisé cette semaine.";
  }
  if (s.community_events_count_14d >= 3) {
    return "Tu as eu des signaux communautaires récents. Cette semaine doit servir à transformer ce momentum en engagement récurrent.";
  }
  if (s.latest_priority_action) {
    return `Ton dernier débrief montre que le principal levier est : ${truncate(
      s.latest_priority_action,
      120,
    )}`;
  }
  if (s.latest_weakness) {
    return `Point faible repéré au dernier live : ${truncate(s.latest_weakness, 120)}.`;
  }
  return fallbackRationale;
}
