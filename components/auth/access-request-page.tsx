"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Mail } from "lucide-react"
import { DemoRequestDialog } from "@/components/landing/demo-request-dialog"
import { useState } from "react"

export function AccessRequestPage({
  signupOpen,
  demoEnabled,
}: {
  signupOpen: boolean
  demoEnabled: boolean
}) {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <div className="landing-page min-h-screen bg-landing-paper px-4 py-10 text-landing-ink sm:px-8">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-[6px] text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à l’accueil
        </Link>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-landing-muted">
            Accès à JobTracker
          </p>
          <h1 className="font-landing-display text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            {signupOpen ? "Crée ton compte ou connecte-toi" : "Demande ton accès"}
          </h1>
          <p className="max-w-xl text-base leading-7 text-landing-muted">
            {signupOpen
              ? "JobTracker est un espace personnel : ton CV, tes offres et tes candidatures restent isolés dans ton compte. Crée ton compte, confirme ton adresse, puis importe ton CV."
              : "Les inscriptions sont fermées pour le moment. L’accès se fait sur demande, avec une adresse e-mail et un mot de passe personnel."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {signupOpen ? (
            <>
              <Link
                href="/login?signup=1"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-landing-ink px-5 text-sm font-medium text-landing-paper transition-colors hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink"
              >
                Créer mon compte
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-[8px] border border-landing-ink px-5 text-sm font-medium text-landing-ink transition-colors hover:bg-[#d9d7d2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink"
              >
                Se connecter
              </Link>
            </>
          ) : demoEnabled ? (
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-landing-ink px-5 text-sm font-medium text-landing-paper transition-colors hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink"
            >
              Demander un accès démo
              <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : null}
          <Link
            href={signupOpen ? "/" : "/login"}
            className="inline-flex min-h-12 items-center justify-center rounded-[8px] border border-landing-ink px-5 text-sm font-medium text-landing-ink transition-colors hover:bg-[#d9d7d2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink"
          >
            {signupOpen ? "Découvrir le produit" : "J’ai déjà un compte"}
          </Link>
        </div>

        {!signupOpen ? (
          <section className="rounded-[8px] border border-landing-ink/15 bg-landing-surface p-5">
            <h2 className="text-lg font-semibold">Comment obtenir un accès</h2>
            <ol className="mt-3 space-y-2 text-base leading-7 text-landing-muted">
              <li>1. Envoie ta demande avec l’adresse e-mail que tu utiliseras.</li>
              <li>2. Un administrateur crée ton compte sur la version hébergée.</li>
              <li>3. Tu reçois tes identifiants, puis tu importes ton CV.</li>
            </ol>
            {!demoEnabled ? (
              <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-landing-muted">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                Le formulaire de demande n’est pas configuré sur cet
                environnement. Écris à l’adresse de contact indiquée sur la page
                d’accueil.
              </p>
            ) : null}
          </section>
        ) : null}
      </main>

      {demoEnabled ? (
        <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      ) : null}
    </div>
  )
}
