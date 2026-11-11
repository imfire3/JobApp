"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CandidateProfileForm } from "@/components/profile/candidate-profile-form"
import { AuthCardShell } from "@/components/auth/auth-card-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHelpButton } from "@/components/onboarding/page-help-button"
import { CircleHelp } from "lucide-react"

export function OnboardingProfilePageClient() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function gate() {
      try {
        const res = await fetch("/api/onboarding")
        const status = (await res.json().catch(() => ({}))) as {
          completed?: boolean
          has_cv?: boolean
          has_profile_reviewed?: boolean
          step?: string
        }

        if (cancelled) return

        if (status.completed) {
          router.replace("/dashboard")
          return
        }

        if (!status.has_cv) {
          router.replace("/login?cv=1")
          return
        }

        if (
          status.has_profile_reviewed ||
          status.step === "api-keys" ||
          status.step === "done"
        ) {
          router.replace("/dashboard")
          return
        }

        setReady(true)
      } catch {
        if (!cancelled) setReady(true)
      }
    }

    void gate()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <AuthCardShell className="!max-w-[980px]">
        <div className="w-full space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-[480px] w-full rounded-2xl" />
        </div>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell className="!max-w-[980px]">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-app-border-strong pb-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[32px] font-bold leading-10 tracking-tight text-app-text">
              Complète ton profil
            </h1>
            <p className="text-base leading-6 tracking-[-0.02em] text-app-text-secondary">
              Nous avons rempli ce que ton CV permet d&apos;extraire. Vérifie,
              complète, puis continue — les champs vides sont OK.
            </p>
            <p className="text-base leading-6 tracking-[-0.02em] text-app-text-secondary">
              CV analysé — vérifie et complète les champs avant d&apos;enregistrer.
            </p>
          </div>
          <PageHelpButton
            pageId="cv"
            label="Aide pour compléter ton profil"
            trigger={(openHelp) => (
              <button
                type="button"
                onClick={openHelp}
                aria-label="Aide pour compléter ton profil"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-app-control text-app-text-secondary transition-colors hover:bg-app-surface hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
              >
                <CircleHelp className="h-6 w-6" aria-hidden />
              </button>
            )}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <CandidateProfileForm
            mode="onboarding"
            onContinue={async () => {
              const res = await fetch("/api/onboarding", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: true }),
              })
              if (!res.ok) {
                const data = (await res.json().catch(() => ({}))) as {
                  error?: string
                }
                throw new Error(
                  data.error ?? "Impossible de finaliser l'inscription"
                )
              }
              router.push("/dashboard")
              router.refresh()
            }}
          />
        </div>
      </div>
    </AuthCardShell>
  )
}
