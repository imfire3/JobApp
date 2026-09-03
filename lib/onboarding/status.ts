export type OnboardingStep = "cv" | "done";

export type OnboardingFlags = {
  hasCv: boolean;
  hasTargets: boolean;
  hasAnalysis: boolean;
  hasTrackedSearch: boolean;
  completed: boolean;
};

/** Simplified onboarding: only CV import is required before entering the app. */
export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep {
  if (flags.completed || flags.hasCv) return "done";
  return "cv";
}

export function canCompleteOnboarding(flags: OnboardingFlags): boolean {
  return flags.hasCv;
}

export function shouldAutoComplete(
  flags: Omit<OnboardingFlags, "completed">
): boolean {
  return flags.hasCv;
}
