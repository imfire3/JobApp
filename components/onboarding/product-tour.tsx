"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  FIRST_VISIT_STEPS,
  PAGE_GUIDE_STEPS,
  PRODUCT_GUIDE_EVENT,
  hasSeenProductGuide,
  markProductGuideSeen,
  type GuideStep,
  type ProductGuideEventDetail,
} from "@/lib/onboarding/product-guide"

type LayoutState = {
  tooltip: { top: number; left: number; mobile: boolean }
  highlight: { top: number; left: number; width: number; height: number } | null
}

const getStepsFromEvent = (detail: ProductGuideEventDetail): GuideStep[] => {
  if (detail.type === "first-visit") return FIRST_VISIT_STEPS
  if (detail.type === "page") return PAGE_GUIDE_STEPS[detail.pageId] ?? []
  return detail.steps
}

export function ProductTour() {
  const router = useRouter()
  const pathname = usePathname()
  const [active, setActive] = useState(() => !hasSeenProductGuide())
  const [steps, setSteps] = useState<GuideStep[]>(FIRST_VISIT_STEPS)
  const [stepIndex, setStepIndex] = useState(0)
  const [layout, setLayout] = useState<LayoutState | null>(null)
  const [isFirstVisitRun, setIsFirstVisitRun] = useState(() => !hasSeenProductGuide())

  const step = steps[stepIndex]
  const total = steps.length

  const closeGuide = useCallback((markSeen: boolean) => {
    if (markSeen) markProductGuideSeen()
    setActive(false)
    setLayout(null)
  }, [])

  const startGuide = useCallback((nextSteps: GuideStep[], firstVisit: boolean) => {
    if (nextSteps.length === 0) return
    setSteps(nextSteps)
    setStepIndex(0)
    setIsFirstVisitRun(firstVisit)
    setActive(true)
  }, [])

  useEffect(() => {
    const onGuideEvent = (event: Event) => {
      const custom = event as CustomEvent<ProductGuideEventDetail>
      const nextSteps = getStepsFromEvent(custom.detail)
      startGuide(nextSteps, custom.detail.type === "first-visit")
    }

    window.addEventListener(PRODUCT_GUIDE_EVENT, onGuideEvent)
    return () => window.removeEventListener(PRODUCT_GUIDE_EVENT, onGuideEvent)
  }, [startGuide])

  const updateLayout = useCallback(() => {
    if (!step) return

    const target = document.querySelector(step.target) as HTMLElement | null
    const isMobile = window.innerWidth < 768
    const tooltipWidth = Math.min(320, window.innerWidth - 32)
    const gap = 12

    if (!target) {
      setLayout({
        tooltip: {
          top: isMobile
            ? window.innerHeight - 220
            : Math.max(24, window.innerHeight / 2 - 100),
          left: Math.max(16, (window.innerWidth - tooltipWidth) / 2),
          mobile: isMobile,
        },
        highlight: null,
      })
      return
    }

    target.scrollIntoView({ block: "nearest", inline: "nearest" })
    const rect = target.getBoundingClientRect()

    if (isMobile) {
      setLayout({
        tooltip: {
          top: window.innerHeight - 8,
          left: 16,
          mobile: true,
        },
        highlight: {
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        },
      })
      return
    }

    let left = rect.right + gap
    let top = rect.top

    if (left + tooltipWidth > window.innerWidth - 16) {
      left = Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16))
      top = rect.bottom + gap
    }

    const cardHeight = 240
    if (top + cardHeight > window.innerHeight - 16) {
      top = Math.max(16, rect.top - cardHeight - gap)
    }

    top = Math.min(Math.max(16, top), window.innerHeight - cardHeight - 16)
    left = Math.min(Math.max(16, left), window.innerWidth - tooltipWidth - 16)

    setLayout({
      tooltip: { top, left, mobile: false },
      highlight: {
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      },
    })
  }, [step])

  useEffect(() => {
    if (!active || !step) return

    const onPath =
      pathname === step.path ||
      pathname.startsWith(`${step.path}/`) ||
      (step.path === "/jobs" && pathname.startsWith("/jobs"))

    if (!onPath) {
      router.push(step.path)
      return
    }

    const timer = window.setTimeout(() => updateLayout(), 100)
    const onResize = () => updateLayout()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
  }, [active, step, pathname, router, updateLayout])

  useEffect(() => {
    if (!active) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeGuide(isFirstVisitRun)
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        setStepIndex((prev) => Math.min(prev + 1, total - 1))
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setStepIndex((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [active, closeGuide, isFirstVisitRun, total])

  const handleQuit = () => closeGuide(isFirstVisitRun)

  const handleNext = () => {
    if (stepIndex >= total - 1) {
      closeGuide(true)
      return
    }
    setStepIndex((prev) => prev + 1)
  }

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleAction = () => {
    if (!step) return
    if (step.actionHref && step.actionHref !== pathname) {
      router.push(step.actionHref)
    }
    const target = document.querySelector(step.target) as HTMLElement | null
    target?.focus?.()
    target?.scrollIntoView({ block: "center", behavior: "smooth" })
    closeGuide(isFirstVisitRun)
  }

  if (!active || !step || !layout) return null

  const isLast = stepIndex >= total - 1

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-guide-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        aria-label="Quitter le guide"
        onClick={handleQuit}
      />

      {layout.highlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary"
          style={{
            top: layout.highlight.top,
            left: layout.highlight.left,
            width: layout.highlight.width,
            height: layout.highlight.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/55" />
      )}

      <div
        className={
          layout.tooltip.mobile
            ? "absolute inset-x-4 bottom-4 z-[81] max-h-[45vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl"
            : "absolute z-[81] w-[min(100%-2rem,20rem)] rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl"
        }
        style={
          layout.tooltip.mobile
            ? undefined
            : { top: layout.tooltip.top, left: layout.tooltip.left }
        }
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {stepIndex + 1} sur {total}
          </p>
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={handleQuit}
          >
            Plus tard
          </button>
        </div>

        <h2 id="product-guide-title" className="mt-2 text-lg font-semibold leading-snug">
          {step.title}
        </h2>
        <p className="mt-2 text-base leading-7 text-muted-foreground">{step.body}</p>

        {step.actionLabel ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            onClick={handleAction}
          >
            {step.actionLabel}
          </Button>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {stepIndex > 0 ? (
              <Button type="button" variant="ghost" onClick={handleBack}>
                Retour
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={handleQuit}>
                Quitter le guide
              </Button>
            )}
          </div>
          <Button type="button" onClick={handleNext}>
            {isLast ? "Terminer" : "Suivant →"}
          </Button>
        </div>
      </div>
    </div>
  )
}
