import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import { isSelfSignupAllowed } from "@/lib/auth/self-signup"

export const metadata: Metadata = {
  title: "JobTracker — Tes offres, ton CV, tes candidatures",
  description:
    "CRM de candidature pour PO et PM : importe tes offres (CSV, Excel, collage), compare-les à ton CV, génère des lettres personnalisées et suis ton pipeline.",
}

export default function Home() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <LandingPage allowSelfSignup={isSelfSignupAllowed()} />
    </div>
  )
}
