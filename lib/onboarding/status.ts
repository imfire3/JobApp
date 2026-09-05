export type OnboardingStep = "cv" | "metiers" | "done";

export type OnboardingFlags = {
  hasCv: boolean;
  hasTargets: boolean;
  hasAnalysis: boolean;
  hasTrackedSearch: boolean;
  completed: boolean;
};

/** CV → métiers (alerte) → app. */
export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep {
  if (flags.completed) return "done";
  if (!flags.hasCv) return "cv";
  if (!flags.hasTrackedSearch) return "metiers";
  return "done";
}

export function canCompleteOnboarding(flags: OnboardingFlags): boolean {
  return flags.hasCv && flags.hasTrackedSearch;
}

/** Auto-complete only when the user already has a CV and at least one alerte. */
export function shouldAutoComplete(
  flags: Omit<OnboardingFlags, "completed">
): boolean {
  return flags.hasCv && flags.hasTrackedSearch;
}
