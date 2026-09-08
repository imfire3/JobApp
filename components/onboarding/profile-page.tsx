"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CandidateProfileForm } from "@/components/profile/candidate-profile-form"
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress"
import { AuthCardShell } from "@/components/auth/auth-card-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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

        if (status.has_profile_reviewed || status.step === "api-keys" || status.step === "done") {
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
      <AuthCardShell className="!max-w-none">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-[480px] w-full rounded-2xl" />
        </div>
      </AuthCardShell>
    )
  }

  // Viewport-locked shell: card fills available height (touches bottom margin)
  // but never overflows; long sections scroll inside CardContent.
  return (
    <div className="box-border flex h-dvh flex-col overflow-hidden bg-muted/30 px-4 py-6">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <Card className="flex min-h-0 max-h-full flex-1 flex-col gap-0 overflow-hidden rounded-2xl">
          <CardHeader className="shrink-0 space-y-4">
            <OnboardingProgress current="profile" />
            <div className="space-y-1.5">
              <CardTitle>Complète ton profil</CardTitle>
              <CardDescription>
                Nous avons prérempli ce que ton CV permet d&apos;extraire. Vérifie,
                complète, puis continue — les champs vides sont OK.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
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
                    data.error ?? "Impossible de finaliser l’inscription"
                  )
                }
                router.push("/dashboard")
                router.refresh()
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
