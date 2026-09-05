"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"
import { AuthCardShell } from "@/components/auth/auth-card-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AiProvider = "openai" | "anthropic" | "gemini"

type KeysState = {
  ai_provider: AiProvider
  openai_key: string
  anthropic_key: string
  gemini_key: string
}

const defaultKeys: KeysState = {
  ai_provider: "openai",
  openai_key: "",
  anthropic_key: "",
  gemini_key: "",
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

        const settingsRes = await fetch("/api/settings")
        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as {
            settings?: Partial<KeysState>
          }
          const payload = data.settings ?? {}
          if (!cancelled) {
            setKeys({
              ai_provider: (payload.ai_provider as AiProvider) ?? "openai",
              openai_key: payload.openai_key ?? "",
              anthropic_key: payload.anthropic_key ?? "",
              gemini_key: payload.gemini_key ?? "",
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
    setLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider: keys.ai_provider,
          openai_key: keys.openai_key || null,
          anthropic_key: keys.anthropic_key || null,
          gemini_key: keys.gemini_key || null,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Impossible d’enregistrer les clés")

      await finishOnboarding()
      toast.success("Clés enregistrées")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l’enregistrement")
    } finally {
      setLoading(false)
    }
  }

  async function handleSkip() {
    setLoading(true)
    try {
      await finishOnboarding()
      toast.success("Onboarding terminé")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l’inscription")
    } finally {
      setLoading(false)
    }
  }

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
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">AI provider</CardTitle>
              <CardDescription className="pb-4">
                Configure tes clés API pour l’analyse CV et les lettres de motivation.
                Tu pourras les modifier plus tard dans Settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <Label className="mb-0">Provider</Label>
                <Select
                  value={keys.ai_provider}
                  onValueChange={(value) =>
                    setKeys((prev) => ({
                      ...prev,
                      ai_provider: (value as AiProvider) || "openai",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="onboarding-openai-key" className="mb-0">
                  OpenAI key
                </Label>
                <Input
                  id="onboarding-openai-key"
                  type="password"
                  autoComplete="off"
                  value={keys.openai_key}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, openai_key: e.target.value }))
                  }
                  placeholder="sk-…"
                />
              </Field>

              <Field>
                <Label htmlFor="onboarding-anthropic-key" className="mb-0">
                  Anthropic key
                </Label>
                <Input
                  id="onboarding-anthropic-key"
                  type="password"
                  autoComplete="off"
                  value={keys.anthropic_key}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, anthropic_key: e.target.value }))
                  }
                  placeholder="sk-ant-…"
                />
              </Field>

              <Field>
                <Label htmlFor="onboarding-gemini-key" className="mb-0">
                  Gemini key
                </Label>
                <Input
                  id="onboarding-gemini-key"
                  type="password"
                  autoComplete="off"
                  value={keys.gemini_key}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, gemini_key: e.target.value }))
                  }
                  placeholder="AIza…"
                />
              </Field>

              <p className="text-xs text-muted-foreground">
                Tu pourras aussi les modifier plus tard dans Settings. Les clés serveur
                (`.env`) restent prioritaires si configurées.
              </p>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Enregistrement…" : "Aller au dashboard"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => void handleSkip()}
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
