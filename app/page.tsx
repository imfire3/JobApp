import type { Metadata } from "next"
import { Syne } from "next/font/google"
import { LandingPage } from "@/components/landing/landing-page"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "JobTracker — CV, offres et candidatures",
  description:
    "Importe ton CV, capture des offres, compare les mots-clés et suis tes candidatures. Extension Chrome, CSV, analyse ATS.",
}

export default function Home() {
  return (
    <div className={syne.variable}>
      <LandingPage />
    </div>
  )
}
