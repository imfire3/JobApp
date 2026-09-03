export type OnboardingStep =
  | "cv"
  | "targets"
  | "analysis"
  | "search"
  | "collect"
  | "done";

export type OnboardingFlags = {
  hasCv: boolean;
  hasTargets: boolean;
  hasAnalysis: boolean;
  hasTrackedSearch: boolean;
  completed: boolean;
};

export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep {
  if (flags.completed) return "done";
  if (!flags.hasCv) return "cv";
  if (!flags.hasTargets) return "targets";
  if (!flags.hasAnalysis) return "analysis";
  if (!flags.hasTrackedSearch) return "search";
  return "collect";
}

export function canCompleteOnboarding(flags: OnboardingFlags): boolean {
  return (
    flags.hasCv &&
    flags.hasTargets &&
    flags.hasAnalysis &&
    flags.hasTrackedSearch
  );
}

export function shouldAutoComplete(
  flags: Omit<OnboardingFlags, "completed">
): boolean {
  return (
    flags.hasCv &&
    flags.hasTargets &&
    flags.hasAnalysis &&
    flags.hasTrackedSearch
  );
}
