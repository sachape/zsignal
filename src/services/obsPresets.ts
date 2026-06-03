// OBS Assistant presets — pure data, no side effects.
// Each preset describes:
//  - recommended OBS technical settings (resolution / fps / bitrate)
//  - an OBS checklist tailored to the live type
//  - a default tone hint
//  - moments to plan and clip recommendations
// No OBS control, no WebSocket, no stream key.

import type { LiveTone } from "@/services/liveSetupGenerator";

export type LivePresetId =
  | "chill" | "ranked" | "talk" | "discovery" | "event" | "sponsored";

export interface ObsTechnicalRecommendation {
  resolution: string;
  fps: string;
  bitrateKbps: string;
  encoder: string;
  notes: string;
}

export interface ObsChecklistItem {
  id: string;
  label: string;
  category: "audio" | "video" | "scene" | "stream" | "engagement" | "moderation";
}

export interface LivePreset {
  id: LivePresetId;
  label: string;
  description: string;
  suggestedTone: LiveTone;
  obsTechnical: ObsTechnicalRecommendation;
  obsChecklist: ObsChecklistItem[];
  momentsToPlan: string[];
  clipRecommendations: string[];
  titleHints: string[];
  ytDescriptionHints: string[];
}

// Shared baseline OBS checklist items reused across presets.
const BASE_ITEMS: ObsChecklistItem[] = [
  { id: "mic_test", label: "Micro testé (niveau ok, pas de souffle)", category: "audio" },
  { id: "desktop_audio", label: "Audio desktop / jeu audible", category: "audio" },
  { id: "start_scene", label: "Scène de départ prête (BRB ou intro)", category: "scene" },
  { id: "game_capture", label: "Capture de jeu / écran fonctionnelle", category: "video" },
  { id: "local_rec", label: "Enregistrement local activé si souhaité", category: "stream" },
  { id: "chat_open", label: "Chat ouvert (Twitch / YouTube Studio)", category: "engagement" },
  { id: "alerts_overlay", label: "Alertes et overlays actifs", category: "engagement" },
];

const MOD_ITEM: ObsChecklistItem = {
  id: "moderation", label: "Modération en place (bot, modos prévenus)", category: "moderation",
};

export const LIVE_PRESETS: LivePreset[] = [
  {
    id: "chill",
    label: "Chill",
    description: "Session détendue, focus discussion et ambiance.",
    suggestedTone: "chill",
    obsTechnical: {
      resolution: "1920x1080",
      fps: "30 fps",
      bitrateKbps: "4500 kbps",
      encoder: "x264 / NVENC",
      notes: "30 fps suffit pour un live posé, garde du CPU pour le chat.",
    },
    obsChecklist: [...BASE_ITEMS, MOD_ITEM],
    momentsToPlan: [
      "Accueil chaleureux des premiers viewers",
      "Pause discussion vers le milieu du live",
      "Mot de fin et rappel des prochains lives",
    ],
    clipRecommendations: [
      "Moment drôle imprévu",
      "Meilleure interaction chat",
    ],
    titleHints: ["chill", "détente", "tranquille"],
    ytDescriptionHints: ["Live chill, viens discuter."],
  },
  {
    id: "ranked",
    label: "Ranked / compétitif",
    description: "Tryhard, focus performance, réactivité maximale.",
    suggestedTone: "competitive",
    obsTechnical: {
      resolution: "1920x1080",
      fps: "60 fps",
      bitrateKbps: "6000 kbps",
      encoder: "NVENC (recommandé)",
      notes: "60 fps + 6000 kbps pour le mouvement rapide. Vérifie ton CPU/GPU.",
    },
    obsChecklist: [
      ...BASE_ITEMS,
      MOD_ITEM,
      { id: "push_to_talk", label: "Push-to-talk vocal team configuré", category: "audio" },
      { id: "game_perf", label: "Mode performance jeu activé (V-Sync, latence)", category: "video" },
    ],
    momentsToPlan: [
      "Annonce de l'objectif rang dès le début",
      "Mise à jour LP / rang toutes les 30 minutes",
      "Récap fin de session : winrate, objectif atteint ?",
    ],
    clipRecommendations: [
      "Meilleure action / clutch",
      "Promotion ou défaite décisive",
    ],
    titleHints: ["ranked", "tryhard", "objectif"],
    ytDescriptionHints: ["Session ranked sérieuse, objectif clair."],
  },
  {
    id: "talk",
    label: "Talk / Just Chatting",
    description: "Discussion, débat, Q&A — pas de jeu en focus.",
    suggestedTone: "entertainment",
    obsTechnical: {
      resolution: "1920x1080",
      fps: "30 fps",
      bitrateKbps: "4500 kbps",
      encoder: "x264 / NVENC",
      notes: "Priorité au son et à la caméra, pas besoin de 60 fps.",
    },
    obsChecklist: [
      ...BASE_ITEMS,
      MOD_ITEM,
      { id: "camera_framing", label: "Cadrage caméra et éclairage vérifiés", category: "video" },
      { id: "topics_ready", label: "Sujets / questions préparés", category: "engagement" },
    ],
    momentsToPlan: [
      "Sujet d'ouverture qui accroche",
      "Q&A milieu de live",
      "Conclusion / annonce next stream",
    ],
    clipRecommendations: [
      "Punchline ou avis tranché",
      "Anecdote ou story marquante",
    ],
    titleHints: ["talk", "on en parle", "débat", "questions"],
    ytDescriptionHints: ["Live discussion, viens poser tes questions."],
  },
  {
    id: "discovery",
    label: "Découverte jeu",
    description: "Première fois sur un jeu, exploration et réactions.",
    suggestedTone: "entertainment",
    obsTechnical: {
      resolution: "1920x1080",
      fps: "60 fps",
      bitrateKbps: "6000 kbps",
      encoder: "NVENC (recommandé)",
      notes: "60 fps pour bien capter les cinématiques et les réactions.",
    },
    obsChecklist: [
      ...BASE_ITEMS,
      MOD_ITEM,
      { id: "spoiler_warning", label: "Règle anti-spoiler annoncée au chat", category: "engagement" },
      { id: "game_installed", label: "Jeu installé, lancé et patché", category: "video" },
    ],
    momentsToPlan: [
      "Pourquoi tu testes ce jeu",
      "Première impression à mi-parcours",
      "Verdict final + note",
    ],
    clipRecommendations: [
      "Première grosse réaction",
      "Bug ou moment WTF",
      "Verdict final",
    ],
    titleHints: ["découverte", "première fois", "je teste"],
    ytDescriptionHints: ["Première fois sur ce jeu, on découvre ensemble."],
  },
  {
    id: "event",
    label: "Event communautaire",
    description: "Sub goal, anniversaire, charity, tournoi communautaire.",
    suggestedTone: "entertainment",
    obsTechnical: {
      resolution: "1920x1080",
      fps: "60 fps",
      bitrateKbps: "6000 kbps",
      encoder: "NVENC (recommandé)",
      notes: "Bitrate confortable pour les moments forts et overlays animés.",
    },
    obsChecklist: [
      ...BASE_ITEMS,
      MOD_ITEM,
      { id: "event_overlay", label: "Overlay event (compteur, goal) actif", category: "engagement" },
      { id: "schedule_posted", label: "Programme de l'event partagé au chat", category: "engagement" },
      { id: "guests_briefed", label: "Invités / co-streamers prévenus", category: "engagement" },
    ],
    momentsToPlan: [
      "Ouverture solennelle de l'event",
      "Étapes / objectifs intermédiaires",
      "Clôture et remerciements",
    ],
    clipRecommendations: [
      "Moment d'émotion ou seuil franchi",
      "Meilleure interaction communautaire",
    ],
    titleHints: ["event", "spécial", "live spécial"],
    ytDescriptionHints: ["Live événement, merci à la communauté."],
  },
  {
    id: "sponsored",
    label: "Sponsorisé",
    description: "Live partenaire, mention obligatoire, contraintes contractuelles.",
    suggestedTone: "entertainment",
    obsTechnical: {
      resolution: "1920x1080",
      fps: "60 fps",
      bitrateKbps: "6000 kbps",
      encoder: "NVENC (recommandé)",
      notes: "Qualité maximale demandée par la plupart des sponsors.",
    },
    obsChecklist: [
      ...BASE_ITEMS,
      MOD_ITEM,
      { id: "sponsor_overlay", label: "Logo / overlay sponsor visible", category: "engagement" },
      { id: "disclosure", label: "Mention « partenariat » annoncée au lancement", category: "engagement" },
      { id: "talking_points", label: "Talking points sponsor relus", category: "engagement" },
    ],
    momentsToPlan: [
      "Annonce du partenariat dès l'intro",
      "Rappel sponsor à mi-live",
      "Code promo / lien rappelé en fin de stream",
    ],
    clipRecommendations: [
      "Démo produit / moment fort sponsor",
      "Réaction authentique liée au produit",
    ],
    titleHints: ["partenariat", "avec", "présenté par"],
    ytDescriptionHints: ["Live en partenariat. Mention obligatoire respectée."],
  },
];

export const PRESET_BY_ID: Record<LivePresetId, LivePreset> = LIVE_PRESETS.reduce(
  (acc, p) => { acc[p.id] = p; return acc; },
  {} as Record<LivePresetId, LivePreset>,
);

export function getPreset(id: string | null | undefined): LivePreset | null {
  if (!id) return null;
  return PRESET_BY_ID[id as LivePresetId] ?? null;
}
