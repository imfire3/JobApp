export type OnboardingStep = "cv" | "api-keys" | "done";

export type OnboardingFlags = {
  hasCv: boolean;
  hasTargets: boolean;
  hasAnalysis: boolean;
  hasTrackedSearch: boolean;
  completed: boolean;
};

/** CV → API keys → app. Métiers reste optionnel hors parcours obligatoire. */
export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep {
  if (flags.completed) return "done";
  if (!flags.hasCv) return "cv";
  return "api-keys";
}

export function canCompleteOnboarding(flags: OnboardingFlags): boolean {
  return flags.hasCv;
}
