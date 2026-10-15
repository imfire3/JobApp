"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { OnboardingStep } from "@/components/product-onboarding/onboarding-step"
import { PRODUCT_ONBOARDING_STEPS } from "@/components/product-onboarding/steps"
import { cn } from "@/lib/utils"

type OnboardingProps = {
  onComplete: () => void | Promise<void>
  completing?: boolean
}

const STEP_TITLE_ID = "product-onboarding-step-title"

export function Onboarding({ onComplete, completing = false }: OnboardingProps) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const total = PRODUCT_ONBOARDING_STEPS.length
  const step = PRODUCT_ONBOARDING_STEPS[index]
  const isLast = index === total - 1
  const isFirst = index === 0

  if (!step) return null

  const handleNext = () => {
    if (isLast) {
      void onComplete()
      return
    }
    setDirection("next")
    setIndex((prev) => Math.min(prev + 1, total - 1))
  }

  const handlePrev = () => {
    setDirection("prev")
    setIndex((prev) => Math.max(prev - 1, 0))
  }

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        // Welcome gate : fermeture uniquement via « Passer » ou fin du parcours.
        if (!nextOpen) return
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-labelledby={STEP_TITLE_ID}
        className="top-0 left-0 z-[60] h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none bg-background p-0 font-sans text-foreground ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">
          Bienvenue dans JobTracker — présentation
        </DialogTitle>

        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-end px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={completing}
              onClick={() => void onComplete()}
            >
              Passer
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6">
            <div
              key={step.id}
              className={cn(
                "flex flex-1 flex-col justify-center py-4",
                "animate-in fade-in-0 duration-200",
                direction === "next"
                  ? "slide-in-from-right-2"
                  : "slide-in-from-left-2"
              )}
            >
              <OnboardingStep
                step={step}
                stepIndex={index}
                total={total}
                titleId={STEP_TITLE_ID}
              />
            </div>

            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 pt-2">
              <div
                role="progressbar"
                aria-label="Progression"
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={index + 1}
                aria-valuetext={`Étape ${index + 1} sur ${total}`}
                className="flex items-center gap-2"
              >
                {PRODUCT_ONBOARDING_STEPS.map((item, i) => (
                  <span
                    key={item.id}
                    aria-hidden
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors",
                      i === index ? "bg-foreground" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              <div className="flex w-full items-center justify-between gap-3">
                <div className="min-w-20">
                  {!isFirst ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={completing}
                      onClick={handlePrev}
                    >
                      Précédent
                    </Button>
                  ) : null}
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="min-w-36"
                  disabled={completing}
                  onClick={handleNext}
                >
                  {completing ? "…" : step.ctaLabel}
                </Button>

                <div className="min-w-20" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
