"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CandidateProfileForm } from "@/components/profile/candidate-profile-form"
import { AuthCardShell } from "@/components/auth/auth-card-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
      <AuthCardShell className="!max-w-5xl">
        <div className="w-full space-y-4 overflow-y-auto">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-[480px] w-full rounded-2xl" />
        </div>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell className="!max-w-5xl">
      <Card className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden shadow-lg sm:max-h-[calc(100dvh-4rem)]">
        <CardHeader className="shrink-0 space-y-3 border-b border-border">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Complète ton profil</CardTitle>
            <CardDescription>
              Nous avons rempli ce que ton CV permet d&apos;extraire. Vérifie,
              complète, puis continue — les champs vides sont OK.
            </CardDescription>
            <p className="text-base leading-6 text-muted-foreground">
              CV analysé — vérifie et complète les champs avant d&apos;enregistrer.
            </p>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
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
    </AuthCardShell>
  )
}
