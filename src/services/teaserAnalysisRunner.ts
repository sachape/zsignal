import { assembleReport } from "./reportAssembler";
import { PublicChannelLookupService } from "./publicChannelLookup";
import { teaserStore, type TeaserRecord } from "./teaserStore";

export type TeaserStage =
  | "looking_up"
  | "loading_data"
  | "computing_facts"
  | "scoring"
  | "matching_competitors"
  | "generating_recommendations"
  | "completed"
  | "not_found"
  | "failed";

export interface RunTeaserOptions {
  channelInput: string;
  onStage?: (stage: TeaserStage) => void;
}

export type RunTeaserResult =
  | { ok: true; record: TeaserRecord }
  | { ok: false; reason: "not_found" | "failed"; message?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runTeaserAnalysis({
  channelInput,
  onStage,
}: RunTeaserOptions): Promise<RunTeaserResult> {
  try {
    onStage?.("looking_up");
    const match = await PublicChannelLookupService.findByInput(channelInput);
    if (!match) {
      onStage?.("not_found");
      return { ok: false, reason: "not_found" };
    }

    onStage?.("loading_data");
    await sleep(350);
    onStage?.("computing_facts");
    await sleep(300);
    onStage?.("scoring");
    await sleep(300);
    onStage?.("matching_competitors");
    await sleep(300);
    onStage?.("generating_recommendations");
    await sleep(250);

    const report = assembleReport(match.data, `teaser-${match.login}`, {
      platform: "twitch",
      platform_user_id: match.data.profile.twitch_user_id ?? null,
      platform_login: match.login,
      display_name: match.data.profile.display_name,
      avatar_url: match.data.profile.profile_image_url || null,
      is_demo: true,
    });
    const record = teaserStore.save(match.login, report);
    teaserStore.setPendingChannel(match.login);

    onStage?.("completed");
    return { ok: true, record };
  } catch (e) {
    onStage?.("failed");
    return {
      ok: false,
      reason: "failed",
      message: e instanceof Error ? e.message : "Erreur inconnue",
    };
  }
}
