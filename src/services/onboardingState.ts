import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep = "analyse" | "plan";

export interface OnboardingState {
  steps_visited: OnboardingStep[];
  completed_at: string | null;
  is_completed: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  steps_visited: [],
  completed_at: null,
  is_completed: false,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return DEFAULT_STATE;

  const { data, error } = await supabase
    .from("user_onboarding")
    .select("steps_visited, completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_STATE;

  const steps = (data.steps_visited ?? []).filter(
    (s): s is OnboardingStep => s === "analyse" || s === "plan",
  );
  return {
    steps_visited: steps,
    completed_at: data.completed_at,
    is_completed: !!data.completed_at,
  };
}

export async function markOnboardingStepVisited(step: OnboardingStep): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { data: existing } = await supabase
    .from("user_onboarding")
    .select("steps_visited")
    .eq("user_id", userId)
    .maybeSingle();

  const current = new Set<string>(existing?.steps_visited ?? []);
  if (current.has(step)) return;
  current.add(step);

  await supabase
    .from("user_onboarding")
    .upsert(
      { user_id: userId, steps_visited: Array.from(current) },
      { onConflict: "user_id" },
    );
}

export async function completeOnboarding(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { data: existing } = await supabase
    .from("user_onboarding")
    .select("steps_visited, completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.completed_at) return;

  await supabase.from("user_onboarding").upsert(
    {
      user_id: userId,
      steps_visited: existing?.steps_visited ?? [],
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
