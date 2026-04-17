import { supabase } from "@/integrations/supabase/client";

export type FeedbackType =
  | "relevant"
  | "not_relevant"
  | "too_big"
  | "wrong_niche"
  | "good_example"
  | "hidden";

export interface CompetitorFeedback {
  id: string;
  user_id: string;
  report_id: string;
  competitor_key: string;
  feedback_type: FeedbackType;
  created_at: string;
}

export async function saveFeedback(input: {
  userId: string;
  reportId: string;
  competitorKey: string;
  feedbackType: FeedbackType;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("competitor_feedback").insert({
    user_id: input.userId,
    report_id: input.reportId,
    competitor_key: input.competitorKey,
    feedback_type: input.feedbackType,
  });

  // Ignore unique-violation duplicates silently
  if (error && !error.message.includes("duplicate key")) {
    return { error: error as unknown as Error };
  }
  return { error: null };
}

export async function getFeedbackForReport(
  reportId: string,
  userId: string
): Promise<CompetitorFeedback[]> {
  const { data, error } = await supabase
    .from("competitor_feedback")
    .select("*")
    .eq("report_id", reportId)
    .eq("user_id", userId);

  if (error || !data) return [];
  return data as CompetitorFeedback[];
}

export async function removeFeedback(
  feedbackId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("competitor_feedback")
    .delete()
    .eq("id", feedbackId);
  return { error: (error as unknown as Error) ?? null };
}
