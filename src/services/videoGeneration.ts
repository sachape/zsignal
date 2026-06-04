export type VideoGenerationStage =
  | "queued"
  | "worker_started"
  | "downloading"
  | "cutting"
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
      return "En attente";
    case "worker_started":
      return "Préparation";
    case "downloading":
      return "Téléchargement de la VOD";
    case "cutting":
      return "Découpage du clip";
    case "uploading":
      return "Import du MP4";
    case "completed":
      return "Clip généré";
    case "failed":
      return "Échec";
    case "cancelled":
      return "Annulé";
    default:
      return "Préparation";
  }
}

export function getGenerationErrorMessage(errorCode: string | null | undefined): string {
  switch (errorCode) {
    case "twitch_vod_unavailable":
    case "vod_unavailable":
      return "La VOD Twitch n’est pas accessible.";
    case "ffmpeg_error":
      return "Le découpage vidéo a échoué.";
    case "worker_timeout":
      return "La génération a pris trop de temps.";
    case "worker_no_callback":
      return "Le worker vidéo n’a pas répondu.";
    case "active_job_exists":
      return "Une génération est déjà en cours. Attends la fin avant d’en lancer une autre.";
    default:
      return "Réessaie avec un autre moment.";
  }
}