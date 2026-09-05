import type { Metadata } from "next"
import { Syne } from "next/font/google"
import { LandingPage } from "@/components/landing/landing-page"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "JobTracker — CRM de candidature PO / PM",
  description:
    "Centralise tes offres, score le fit avec ton CV, et génère des cover letters personnalisées. Import CSV, WTTJ, extension Chrome.",
}

export default function Home() {
  return (
    <div className={syne.variable}>
      <LandingPage />
    </div>
  )
}
