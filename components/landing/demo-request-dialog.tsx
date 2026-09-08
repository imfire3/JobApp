"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type DemoRequestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoRequestDialog({ open, onOpenChange }: DemoRequestDialogProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [website, setWebsite] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setMessage("")
    setWebsite("")
    setError(null)
    setLoading(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm()
      setSuccess(false)
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          message: message.trim() || undefined,
          website: website.trim() || undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Envoi impossible")
      }
      setSuccess(true)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible")
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-[#111]/15 bg-white px-3 py-2.5 text-sm text-[#111] outline-none transition placeholder:text-[#111]/40 focus:border-[#111]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md gap-0 border-0 bg-[#eceae6] p-0 text-[#111] ring-1 ring-[#111]/10 sm:max-w-md"
        showCloseButton
      >
        <DialogHeader className="gap-2 border-b border-[#111]/10 px-5 py-5 text-left">
          <DialogTitle className="font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight text-[#111]">
            Inscription démo
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[#111]/65">
            Laisse tes coordonnées. On te contacte pour t’ouvrir un accès.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 px-5 py-6">
            <p className="text-sm leading-relaxed text-[#111]/80">
              Demande envoyée. On te contacte pour t’ouvrir l’accès.
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#111] px-5 py-2.5 text-sm font-semibold text-[#eceae6] transition hover:bg-[#2a2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
              onClick={() => handleOpenChange(false)}
              tabIndex={0}
              aria-label="Fermer"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative space-y-4 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="demo-first-name" className="text-sm font-medium">
                  Prénom
                </label>
                <input
                  id="demo-first-name"
                  name="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className={fieldClass}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-last-name" className="text-sm font-medium">
                  Nom
                </label>
                <input
                  id="demo-last-name"
                  name="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className={fieldClass}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="demo-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="demo-email"
                name="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="toi@exemple.com"
                className={fieldClass}
                disabled={loading}
              />
            </div>
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="demo-website">Site web</label>
              <input
                id="demo-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="demo-message" className="text-sm font-medium">
                Message{" "}
                <span className="font-normal text-[#111]/45">(optionnel)</span>
              </label>
              <textarea
                id="demo-message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                className={cn(fieldClass, "resize-y")}
                disabled={loading}
              />
            </div>

            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111] px-5 py-2.5 text-sm font-semibold text-[#eceae6] transition hover:bg-[#2a2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111] disabled:opacity-60"
              aria-label="Envoyer ma demande d’accès démo"
            >
              {loading ? "Envoi…" : "Envoyer ma demande"}
              {!loading ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
