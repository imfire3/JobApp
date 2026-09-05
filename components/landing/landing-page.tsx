"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    n: "01",
    title: "Ajoute ton CV",
    text: "PDF ou texte. Il devient la base du matching, des mots-clés et des lettres.",
  },
  {
    n: "02",
    title: "Importe des offres",
    text: "CSV, Excel, collage de fiche, ou extension Chrome Welcome to the Jungle.",
  },
  {
    n: "03",
    title: "Compare et décide",
    text: "Score de correspondance, mots-clés de l’offre vs ton CV, écarts à combler.",
  },
  {
    n: "04",
    title: "Suis tes candidatures",
    text: "Statuts, entretiens, notes et lettres — le fil de ta recherche au même endroit.",
  },
] as const

const SHOWCASE = [
  {
    src: "/landing/screen-imports.png",
    alt: "Écran Imports de JobTracker",
    label: "Imports",
  },
  {
    src: "/landing/screen-job-detail.png",
    alt: "Fiche offre avec analyse CV et mots-clés",
    label: "Matching",
  },
  {
    src: "/landing/screen-applications.png",
    alt: "Suivi des candidatures",
    label: "Candidatures",
  },
] as const

export function LandingPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#dfe4ea] text-[#0b1220]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(47, 107, 138, 0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(11, 18, 32, 0.08), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(11,18,32,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,18,32,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <p className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight md:text-3xl">
          JobTracker
        </p>
        <nav className="flex items-center gap-2 md:gap-3">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm font-medium text-[#0b1220]/65 transition hover:text-[#0b1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1220]"
            tabIndex={0}
          >
            Connexion
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b1220] px-4 py-2.5 text-sm font-medium text-[#dfe4ea] transition hover:bg-[#1a2438] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1220]"
            tabIndex={0}
          >
            Commencer
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative z-10">
          <div className="mx-auto max-w-6xl px-5 pb-8 pt-4 md:px-8 md:pb-10 md:pt-8">
            <div
              className={cn(
                "transition-all duration-700 ease-out",
                ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              )}
            >
              <h1 className="font-[family-name:var(--font-landing-display)] text-[clamp(3.2rem,9vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.04em]">
                JobTracker
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#0b1220]/72 md:text-xl">
                Importe ton CV, capture des offres, compare les mots-clés et
                suis tes candidatures — sans Excel orphelin ni lettre générique.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0b1220] px-6 py-3 text-sm font-semibold text-[#dfe4ea] transition hover:bg-[#1a2438] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1220]"
                  tabIndex={0}
                  aria-label="Créer un compte et commencer"
                >
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center rounded-full border border-[#0b1220]/2 px-6 py-3 text-sm font-medium transition hover:border-[#0b1220]/4 hover:bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1220]"
                  tabIndex={0}
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "landing-board-drift relative mt-2 w-full transition-all duration-1000 ease-out",
              ready ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            )}
          >
            <div className="relative mx-auto max-w-[1400px] overflow-hidden border-y border-[#0b1220]/12 bg-[#0b1220] shadow-[0_40px_90px_-48px_rgba(11,18,32,0.65)] md:rounded-none lg:mx-5 lg:rounded-2xl lg:border">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                <span className="ml-3 text-xs text-white/40">
                  jobtracker — Offres
                </span>
              </div>
              <div className="relative aspect-[16/9] w-full bg-[#060a12] md:aspect-[21/10]">
                <Image
                  src="/landing/screen-jobs.png"
                  alt="Capture de l’écran Offres de JobTracker"
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="100vw"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 bg-[#0b1220] px-5 py-20 text-[#dfe4ea] md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-2xl font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-5xl">
              Quatre gestes. Une recherche claire.
            </h2>
            <p className="mt-4 max-w-lg text-[#dfe4ea]/60">
              Le même parcours que dans l’app : Mon CV, Imports, Offres,
              Candidatures.
            </p>
            <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  className={cn(
                    "landing-step border-t border-[#dfe4ea]/15 pt-6",
                    ready && "landing-step-in"
                  )}
                  style={{ animationDelay: `${0.12 + index * 0.08}s` }}
                >
                  <span className="font-[family-name:var(--font-landing-display)] text-sm text-[#dfe4ea]/45">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-landing-display)] text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#dfe4ea]/60">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative z-10 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Les mots-clés de l’offre, face à ton CV.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#0b1220]/70">
                JobTracker extrait les termes de la fiche de poste, montre ceux
                déjà présents dans ton profil, et indique quoi renforcer — sans
                inventer d’expérience.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-[#0b1220]/12 bg-[#0b1220] shadow-[0_30px_70px_-40px_rgba(11,18,32,0.5)]">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/landing/screen-job-detail.png"
                  alt="Comparatif mots-clés fiche de poste et CV"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1200px) 100vw, 1100px"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-[#0b1220]/10 bg-[#cfd6df] px-5 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              L’app, en vrai
            </h2>
            <p className="mt-3 max-w-xl text-[#0b1220]/65">
              Imports, matching, candidatures — le cœur du workflow.
            </p>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {SHOWCASE.map((shot, index) => (
                <figure
                  key={shot.src}
                  className={cn(
                    "landing-step overflow-hidden rounded-2xl border border-[#0b1220]/12 bg-[#0b1220]",
                    ready && "landing-step-in"
                  )}
                  style={{ animationDelay: `${0.15 + index * 0.08}s` }}
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption className="border-t border-white/10 px-4 py-3 text-sm font-medium text-[#dfe4ea]">
                    {shot.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-24 pt-10 md:px-8">
          <div className="landing-cta-panel mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 overflow-hidden rounded-2xl bg-[#0b1220] px-8 py-12 text-[#dfe4ea] md:flex-row md:items-center md:px-12 md:py-14">
            <div className="relative z-10 max-w-xl">
              <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Prêt à clarifier ta recherche ?
              </h2>
              <p className="mt-3 text-[#dfe4ea]/65">
                Ajoute ton CV, importe une offre, et vois le matching en une
                session.
              </p>
            </div>
            <Link
              href="/login"
              className="relative z-10 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#dfe4ea] px-6 py-3 text-sm font-semibold text-[#0b1220] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              tabIndex={0}
            >
              Lancer JobTracker
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#0b1220]/10 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-[#0b1220]/50 md:flex-row md:items-center md:justify-between">
          <p className="font-[family-name:var(--font-landing-display)] font-medium text-[#0b1220]/80">
            JobTracker
          </p>
          <p>Mon CV · Imports · Offres · Candidatures</p>
        </div>
      </footer>
    </div>
  )
}
