export type OnboardingStep = "cv" | "profile" | "api-keys" | "done"

export type OnboardingFlags = {
  hasCv: boolean
  hasProfileReviewed: boolean
  hasTargets: boolean
  hasAnalysis: boolean
  hasTrackedSearch: boolean
  completed: boolean
}

/** CV → profile review → app. OpenAI is platform-managed (no user key step). */
export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep {
  if (flags.completed) return "done"
  if (!flags.hasCv) return "cv"
  if (!flags.hasProfileReviewed) return "profile"
  return "done"
}

export function canCompleteOnboarding(flags: OnboardingFlags): boolean {
  return flags.hasCv && flags.hasProfileReviewed
}
