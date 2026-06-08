export type VideoGenerationStage =
  | "queued"
  | "worker_started"
  | "downloading"
  | "cutting"
  | "compositing"
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
      return "Préparation du clip";
    case "downloading":
      return "Téléchargement de la source";
    case "cutting":
      return "Découpage de la VOD";
    case "compositing":
      return "Création du format vertical";
    case "uploading":
      return "Export du MP4";
    case "completed":
      return "Clip prêt";
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
      return "La VOD n’est pas accessible.";
    case "ffmpeg_error":
      return "Le découpage vidéo a échoué.";
    case "worker_timeout":
      return "La génération a pris trop de temps.";
    case "worker_no_callback":
      return "Le worker vidéo n’a pas répondu.";
    case "active_job_exists":
      return "Une génération est déjà en cours. Attends la fin avant d’en lancer une autre.";
    case "invalid_layout":
      return "Le format de caméra est invalide. Reconfigure ton preset.";
    case "missing_preset":
      return "Configure ta caméra pour générer un clip vertical.";
    case "unsupported_mime":
      return "Format de fichier non supporté. Utilise MP4, MOV ou WebM.";
    default:
      return "Réessaie avec un autre moment.";
  }
}
