import type { Metadata } from "next"
import { AccessRequestPage } from "@/components/auth/access-request-page"
import {
  isDemoRequestEnabled,
  isSignupOpen,
} from "@/lib/auth/self-signup"

export const metadata: Metadata = {
  title: "Accès — JobTracker",
  description:
    "Crée ton compte JobTracker ou demande un accès démo pour importer ton CV et suivre tes candidatures.",
}

export default function AccessPage() {
  return (
    <AccessRequestPage
      signupOpen={isSignupOpen()}
      demoEnabled={isDemoRequestEnabled()}
    />
  )
}
