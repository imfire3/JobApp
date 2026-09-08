"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { AuthCardShell } from "@/components/auth/auth-card-shell"
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type KeysState = {
  openai_key: string
}

const defaultKeys: KeysState = {
  openai_key: "",
}

export function ApiKeysPageClient() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState<KeysState>(defaultKeys)

  useEffect(() => {
    let cancelled = false

    async function gate() {
      try {
        const statusRes = await fetch("/api/onboarding")
        const status = (await statusRes.json().catch(() => ({}))) as {
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

        if (!status.has_profile_reviewed && status.step !== "api-keys") {
          router.replace("/onboarding/profile")
          return
        }

        const settingsRes = await fetch("/api/settings")
        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as {
            settings?: Partial<KeysState>
          }
          const payload = data.settings ?? {}
          if (!cancelled) {
            setKeys({
              openai_key: payload.openai_key ?? "",
            })
          }
        }

        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) setReady(true)
      }
    }

    void gate()
    return () => {
      cancelled = true
    }
  }, [router])

  async function finishOnboarding() {
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      throw new Error(data.error ?? "Impossible de finaliser l’inscription")
    }
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    const openaiKey = keys.openai_key.trim()
    if (!openaiKey) {
      toast.error("Ajoute ta clé API OpenAI pour continuer")
      return
    }
    if (!openaiKey.startsWith("sk-")) {
      toast.error("La clé OpenAI doit commencer par sk-")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider: "openai",
          openai_key: openaiKey,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Impossible d’enregistrer la clé")

      await finishOnboarding()
      toast.success("Clé OpenAI enregistrée")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l’enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const canContinue = keys.openai_key.trim().startsWith("sk-")

  return (
    <AuthCardShell>
      {!ready ? (
        <Card className="w-full shadow-lg">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chargement…
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full shadow-lg">
          <form onSubmit={handleContinue}>
            <CardHeader className="space-y-4 text-center">
              <OnboardingProgress current="api-keys" className="text-left" />
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Ta clé OpenAI</CardTitle>
              <CardDescription className="pb-2 text-left sm:text-center">
                JobTracker utilise ta propre clé OpenAI pour analyser le CV, scorer les
                offres et générer les lettres. Sans clé valide (et sans crédit sur le
                compte OpenAI), ces fonctions ne marchent pas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-left text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">Important — crédit OpenAI</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>
                    Crée ou ouvre un compte sur{" "}
                    <a
                      href="https://platform.openai.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      platform.openai.com
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                  <li>
                    Ajoute un moyen de paiement / du crédit (Billing) — un compte gratuit
                    sans solde ne suffit en général pas.
                  </li>
                  <li>
                    Crée une clé API (API keys), copie-la ici, puis continue.
                  </li>
                </ol>
              </div>

              <Field>
                <Label htmlFor="onboarding-openai-key" className="mb-0">
                  Clé API OpenAI
                </Label>
                <Input
                  id="onboarding-openai-key"
                  type="password"
                  autoComplete="off"
                  required
                  value={keys.openai_key}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, openai_key: e.target.value }))
                  }
                  placeholder="sk-…"
                />
              </Field>

              <p className="text-xs text-muted-foreground">
                Tu pourras aussi ajouter ou modifier cette clé plus tard dans Compte
                &amp; clés API. Elle reste privée à ton compte JobTracker.
              </p>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !canContinue}
              >
                {loading ? "Enregistrement…" : "Enregistrer et continuer"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true)
                  try {
                    await finishOnboarding()
                    toast.message(
                      "Tu pourras ajouter ta clé OpenAI dans Compte & clés API."
                    )
                    router.push("/dashboard")
                    router.refresh()
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Impossible de finaliser l’inscription"
                    )
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                Passer pour l’instant
              </Button>
            </CardContent>
          </form>
        </Card>
      )}
    </AuthCardShell>
  )
}
