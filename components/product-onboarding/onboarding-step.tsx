"use client"

import { cn } from "@/lib/utils"
import type { ProductOnboardingStep } from "@/components/product-onboarding/steps"

type OnboardingStepProps = {
  step: ProductOnboardingStep
  stepIndex: number
  total: number
  className?: string
}

export function OnboardingStep({
  step,
  stepIndex,
  total,
  className,
}: OnboardingStepProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col items-center text-center",
        className
      )}
    >
      <div className="mb-6 w-full sm:mb-8">{step.illustration}</div>

      <p className="mb-3 text-xs font-medium tabular-nums text-muted-foreground">
        {stepIndex + 1} / {total}
      </p>

      <h1 className="font-heading text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {step.title}
      </h1>

      <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
        {step.description}
      </p>

      {step.footnote ? (
        <p className="mt-3 max-w-md text-xs text-muted-foreground/90">
          {step.footnote}
        </p>
      ) : null}
    </div>
  )
}
