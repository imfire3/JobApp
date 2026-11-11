import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import {
  isDemoRequestEnabled,
  isSignupOpen,
} from "@/lib/auth/self-signup"

export const metadata: Metadata = {
  title: "JobTracker — Tes offres, ton CV, tes candidatures",
  description:
    "Le CRM de candidature pour Product Owners et Product Managers : importe tes offres, compare-les à ton CV, prépare une lettre et suis tes candidatures.",
}

export default function Home() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <LandingPage
        signupOpen={isSignupOpen()}
        demoEnabled={isDemoRequestEnabled()}
      />
    </div>
  )
}
