export type VideoGenerationStage =
  | "queued"
  | "worker_started"
  | "downloading"
  | "analyzing_layout"
  | "detecting_facecam"
  | "cutting"
  | "compositing"
  | "transcribing_audio"
  | "rendering_subtitles"
  | "uploading"
  | "completed"
  | "failed"
  | "cancelled";

export const ACTIVE_VIDEO_JOB_STATUSES = ["queued", "processing"] as const;

export function isActiveVideoJobStatus(status: string | null | undefined): boolean {
  return status === "queued" || status === "processing";
}

export function getGenerationStageLabel(stage: VideoGenerationStage | null | undefined): string {
  switch (stage) {
    case "queued":
    case "worker_started":
      return "Préparation du clip";
    case "downloading":
      return "Récupération de la vidéo";
    case "analyzing_layout":
      return "Analyse du layout";
    case "detecting_facecam":
      return "Détection de la facecam";
    case "cutting":
    case "compositing":
      return "Création du format vertical";
    case "uploading":
      return "Export du MP4";
    case "completed":
      return "Clip généré";
    case "failed":
      return "Échec";
    case "cancelled":
      return "Annulé";
    default:
      return "Préparation du clip";
  }
}

export function getGenerationErrorMessage(errorCode: string | null | undefined): string {
  switch (errorCode) {
    case "twitch_vod_unavailable":
    case "vod_unavailable":
      return "La vidéo Twitch n'est pas accessible.";
    case "ffmpeg_error":
      return "Le découpage vidéo a échoué.";
    case "worker_timeout":
      return "La génération a pris trop de temps.";
    case "worker_no_callback":
      return "Le worker vidéo n'a pas répondu.";
    case "active_job_exists":
      return "Une génération est déjà en cours. Attends la fin avant d'en lancer une autre.";
    default:
      return "Réessaie avec un autre moment.";
  }
}
