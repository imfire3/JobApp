import type { ReactNode } from "react"
import {
  AiWorkflowIllustration,
  BenefitsIllustration,
  BoardIllustration,
} from "@/components/product-onboarding/illustrations"

export type ProductOnboardingStepId = "concept" | "add" | "manage"

export type ProductOnboardingStep = {
  id: ProductOnboardingStepId
  title: string
  description: string
  footnote?: string
  ctaLabel: string
  illustration: ReactNode
}

export const PRODUCT_ONBOARDING_STEPS: ProductOnboardingStep[] = [
  {
    id: "concept",
    title: "Toutes tes candidatures, enfin au même endroit.",
    description:
      "Job Tracker t’aide à centraliser tes candidatures, suivre leur avancement et savoir exactement où tu en es dans ta recherche d’emploi.",
    ctaLabel: "Continuer",
    illustration: <BoardIllustration />,
  },
  {
    id: "add",
    title: "Ajoute une offre, l’IA s’occupe du reste.",
    description:
      "Depuis l’extension Chrome ou directement depuis Job Tracker, ajoute une offre d’emploi et laisse l’IA récupérer les informations importantes pour pré-remplir ta candidature.",
    footnote: "Tu peux toujours modifier les informations avant de les enregistrer.",
    ctaLabel: "Continuer",
    illustration: <AiWorkflowIllustration />,
  },
  {
    id: "manage",
    title: "Concentre-toi sur les bonnes opportunités.",
    description:
      "Déplace tes candidatures dans le board, retrouve toutes les informations importantes et utilise l’IA pour t’aider à préparer chaque étape.",
    ctaLabel: "Commencer",
    illustration: <BenefitsIllustration />,
  },
]
