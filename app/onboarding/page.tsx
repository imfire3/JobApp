import { redirect } from "next/navigation";

/** Legacy /onboarding → CV step on login. */
export default function OnboardingPage() {
  redirect("/login?cv=1");
}
