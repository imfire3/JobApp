import { redirect } from "next/navigation";

/** CV import lives on /login — keep this route as a redirect for old links. */
export default function OnboardingPage() {
  redirect("/login?cv=1");
}
