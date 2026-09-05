"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Puzzle, ScanSearch } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    n: "01",
    title: "Importe ton CV",
    text: "PDF ou texte. Il devient le contexte unique pour le matching et les lettres.",
  },
  {
    n: "02",
    title: "Capture les offres",
    text: "Extension Chrome WTTJ : un clic sur une offre, un seul CSV. Ou import CSV / Apify.",
  },
  {
    n: "03",
    title: "ATS + mots-clés",
    text: "Analyse ATS, mots-clés présents / manquants, optimisation CV avant / après.",
  },
] as const

const SHOWCASE = [
  {
    src: "/landing/screen-extension.png",
    alt: "Guide d’installation de l’extension Chrome",
    label: "Extension Chrome",
  },
  {
    src: "/landing/screen-optimize.png",
    alt: "Analyse ATS et table de mots-clés",
    label: "ATS & mots-clés",
  },
  {
    src: "/landing/screen-job-detail.png",
    alt: "Fiche offre — analyse CV et cover letter",
    label: "Analyse fiche",
  },
] as const

export function LandingPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#eceae6] text-[#111111]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(17,17,17,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,17,17,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-8%] h-[65vh] w-[55vw] rounded-full bg-[radial-gradient(circle,rgba(17,17,17,0.08)_0%,transparent_65%)]"
      />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <p className="font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight md:text-2xl">
          JobTracker
        </p>
        <nav className="flex items-center gap-2 md:gap-3">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm font-medium text-[#111]/70 transition hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
            tabIndex={0}
          >
            Connexion
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-4 py-2.5 text-sm font-medium text-[#eceae6] transition hover:bg-[#2a2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
            tabIndex={0}
          >
            Commencer
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative z-10">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-8 md:pb-14 md:pt-10">
            <div
              className={cn(
                "max-w-2xl transition-all duration-700 ease-out",
                ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              )}
            >
              <p className="mb-4 font-[family-name:var(--font-landing-display)] text-sm font-medium uppercase tracking-[0.22em] text-[#111]/55">
                JobTracker
              </p>
              <h1 className="font-[family-name:var(--font-landing-display)] text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
                Le CRM de candidature pour PO &amp; PM.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#111]/70 md:text-lg">
                Extension Chrome pour WTTJ, analyse ATS et mots-clés, cover
                letters ancrées dans ton CV — plus de CSV orphelins ni de lettres
                génériques.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-[#eceae6] transition hover:bg-[#2a2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
                  tabIndex={0}
                  aria-label="Créer un compte et commencer"
                >
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center rounded-full border border-[#111]/25 px-6 py-3 text-sm font-medium transition hover:border-[#111]/45 hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
                  tabIndex={0}
                >
                  Se connecter
                </Link>
              </div>
            </div>

            <div
              className={cn(
                "landing-board-drift relative mt-12 transition-all duration-1000 ease-out md:mt-16",
                ready ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              )}
            >
              <div className="overflow-hidden rounded-xl border border-[#111]/12 bg-[#111] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.55)]">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                  <span className="ml-3 text-xs text-white/40">app.jobtracker — Jobs</span>
                </div>
                <div className="relative aspect-[16/10] w-full bg-[#0a0a0a]">
                  <Image
                    src="/landing/screen-jobs.png"
                    alt="Capture de l’écran Jobs de JobTracker"
                    fill
                    priority
                    className="object-cover object-top"
                    sizes="(max-width: 1200px) 100vw, 1100px"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-[#111]/10 bg-[#111] px-5 py-20 text-[#eceae6] md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-2xl font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-5xl">
              Un flux. De l’import à la lettre.
            </h2>
            <p className="mt-4 max-w-lg text-[#eceae6]/60">
              Pas un énième tableau Kanban vide — un atelier de candidature branché
              sur ton CV et tes sources.
            </p>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  className={cn(
                    "landing-step border-t border-[#eceae6]/15 pt-6",
                    ready && "landing-step-in"
                  )}
                  style={{ animationDelay: `${0.15 + index * 0.1}s` }}
                >
                  <span className="font-[family-name:var(--font-landing-display)] text-sm text-[#eceae6]/45">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-landing-display)] text-xl font-semibold md:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#eceae6]/60">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative z-10 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl space-y-16">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#111]/55">
                  <Puzzle className="h-4 w-4" aria-hidden />
                  Extension Chrome
                </p>
                <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Capture une offre WTTJ en un clic.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  Sur une fiche Welcome to the Jungle, l’extension JobTracker
                  ajoute l’offre dans <strong className="font-semibold text-[#111]">un seul CSV</strong> —
                  pas dix fichiers qui traînent. Tu réimportes ensuite dans
                  Imports, et l’offre arrive dans ton board.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[#111]/70">
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Install en mode développeur (Chrome ou Arc)
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Un fichier CSV unique, réécrit à chaque ajout
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Import direct vers Jobs + analyse
                  </li>
                </ul>
              </div>
              <figure className="overflow-hidden rounded-xl border border-[#111]/12 bg-[#111] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-[16/11] w-full">
                  <Image
                    src="/landing/screen-extension.png"
                    alt="Écran Extension Chrome dans JobTracker"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </figure>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <figure className="order-2 overflow-hidden rounded-xl border border-[#111]/12 bg-[#111] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.45)] lg:order-1">
                <div className="relative aspect-[16/11] w-full">
                  <Image
                    src="/landing/screen-optimize.png"
                    alt="Écran d’optimisation CV et mots-clés ATS"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </figure>
              <div className="order-1 lg:order-2">
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#111]/55">
                  <ScanSearch className="h-4 w-4" aria-hidden />
                  Analyse ATS &amp; mots-clés
                </p>
                <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Vois ce que le ATS voit vraiment.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  JobTracker scrape ton CV et la fiche de poste : compétences
                  détectées, outils, rôles, et surtout les{" "}
                  <strong className="font-semibold text-[#111]">mots-clés manquants</strong>.
                  Tu compares CV avant / après, tu ajoutes ce qui manque, et tu
                  suis le taux d’utilisation.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[#111]/70">
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Scores ATS (parsing, structure, impact, keywords)
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Table mots-clés : présent / absent / ajouter
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Optimisation CV avant → après avec % d’utilisation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-[#111]/10 bg-[#f5f3ef] px-5 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              L’app, en vrai
            </h2>
            <p className="mt-3 max-w-xl text-[#111]/65">
              Extension, ATS &amp; mots-clés, analyse de fiche — le cœur du
              workflow.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {SHOWCASE.map((shot, index) => (
                <figure
                  key={shot.src}
                  className={cn(
                    "landing-step overflow-hidden rounded-xl border border-[#111]/12 bg-[#111]",
                    ready && "landing-step-in"
                  )}
                  style={{ animationDelay: `${0.2 + index * 0.08}s` }}
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
                  <figcaption className="border-t border-white/10 px-4 py-3 text-sm font-medium text-[#eceae6]">
                    {shot.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-24 pt-8 md:px-8">
          <div className="landing-cta-panel mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 overflow-hidden bg-[#111] px-8 py-12 text-[#eceae6] md:flex-row md:items-center md:px-12 md:py-14">
            <div className="relative z-10 max-w-xl">
              <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Prêt à ranger ta recherche d’emploi ?
              </h2>
              <p className="mt-3 text-[#eceae6]/65">
                Installe l’extension, lance une analyse ATS, et sors ta première
                lettre en moins d’une session.
              </p>
            </div>
            <Link
              href="/login"
              className="relative z-10 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#eceae6] px-6 py-3 text-sm font-semibold text-[#111] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              tabIndex={0}
            >
              Lancer JobTracker
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#111]/10 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-[#111]/50 md:flex-row md:items-center md:justify-between">
          <p className="font-[family-name:var(--font-landing-display)] font-medium text-[#111]/80">
            JobTracker
          </p>
          <p>Extension Chrome · ATS &amp; mots-clés · cover letters.</p>
        </div>
      </footer>
    </div>
  )
}
