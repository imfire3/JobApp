import { redirect } from "next/navigation";

/** API keys are platform-managed — skip this onboarding step. */
export default function OnboardingApiKeysPage() {
  redirect("/dashboard");
}
