"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    n: "01",
    title: "Ajoute ton CV",
    text: "Importe ton PDF ou colle son texte. Ton expérience sert de base aux analyses et aux lettres de motivation.",
  },
  {
    n: "02",
    title: "Ajoute une offre qui t’intéresse",
    text: "Colle la description du poste ou importe tes offres depuis un fichier CSV ou Excel.",
  },
  {
    n: "03",
    title: "Prépare ta candidature",
    text: "Compare ton profil aux attentes du poste, améliore les passages utiles de ton CV et prépare une lettre personnalisée.",
  },
  {
    n: "04",
    title: "Suis la suite",
    text: "Retrouve tes candidatures, mets à jour leur statut et garde tes dates d’entretien et tes notes au même endroit.",
  },
] as const

const FAQ = [
  {
    q: "À qui s’adresse JobTracker ?",
    a: "JobTracker est pensé pour les Product Owners et Product Managers qui souhaitent centraliser leurs offres, adapter leurs candidatures et suivre leurs démarches.",
  },
  {
    q: "Est-ce que l’extension est obligatoire ?",
    a: "Non. Tu peux coller le texte d’une offre ou importer un fichier CSV ou Excel directement dans l’application.",
  },
  {
    q: "Quelle différence entre l’analyse du CV et le score de correspondance ?",
    a: "L’analyse du CV examine la qualité de son contenu : structure, clarté et présentation des expériences. Le score de correspondance compare ton CV aux exigences d’une offre précise.",
  },
  {
    q: "Le score ATS garantit-il que mon CV sera retenu ?",
    a: "Non. Il s’agit d’une évaluation indicative. Les logiciels et les critères utilisés varient selon les employeurs.",
  },
  {
    q: "Dois-je ajouter tous les mots-clés suggérés ?",
    a: "Non. Ajoute ou précise uniquement les compétences qui correspondent à ton expérience réelle. Une information absente de ton CV n’est pas forcément une compétence que tu ne possèdes pas.",
  },
  {
    q: "La lettre est-elle prête à envoyer ?",
    a: "C’est un premier brouillon personnalisé. Relis les informations, ajuste le ton et vérifie que chaque phrase correspond à ce que tu souhaites présenter.",
  },
] as const

const navLinkClass =
  "rounded-full px-3 py-2 text-sm font-medium text-[#111]/70 transition hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"

const primaryCtaClass =
  "inline-flex min-h-12 items-center gap-2 rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-[#eceae6] transition hover:bg-[#2a2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"

const secondaryCtaClass =
  "inline-flex min-h-12 items-center rounded-full border border-[#111]/25 px-6 py-3 text-sm font-medium transition hover:border-[#111]/45 hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"

export function LandingPage() {
  const [ready, setReady] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative h-dvh overflow-y-auto overflow-x-hidden overscroll-contain bg-[#eceae6] text-[#111111]">
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

      <header className="relative z-20 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-8">
        <p className="font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight md:text-2xl">
          JobTracker
        </p>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
          <a href="#comment-ca-marche" className={navLinkClass} tabIndex={0}>
            Comment ça marche
          </a>
          <a href="#fonctionnalites" className={navLinkClass} tabIndex={0}>
            Fonctionnalités
          </a>
          <a href="#faq" className={navLinkClass} tabIndex={0}>
            Questions fréquentes
          </a>
        </nav>
        <nav className="flex items-center gap-2 md:gap-3" aria-label="Compte">
          <Link href="/login" className={navLinkClass} tabIndex={0}>
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
                "max-w-3xl transition-all duration-700 ease-out",
                ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              )}
            >
              <p className="mb-4 font-[family-name:var(--font-landing-display)] text-sm font-medium uppercase tracking-[0.18em] text-[#111]/55">
                Pour les Product Owners et Product Managers
              </p>
              <h1 className="font-[family-name:var(--font-landing-display)] text-[clamp(2.4rem,6.5vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.03em]">
                Tes offres, ton CV, tes candidatures. Au même endroit.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#111]/70 md:text-lg">
                Compare les offres à ton profil, repère les améliorations utiles pour
                ton CV et prépare une lettre adaptée à chaque poste. Garde ensuite le
                fil de tes candidatures jusqu’aux entretiens.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className={primaryCtaClass}
                  tabIndex={0}
                  aria-label="Commencer avec mon CV"
                >
                  Commencer avec mon CV
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href="#comment-ca-marche" className={secondaryCtaClass} tabIndex={0}>
                  Voir comment ça marche
                </a>
              </div>
              <p className="mt-4 text-sm text-[#111]/55">
                Importe ton CV en PDF ou colle simplement son texte.
              </p>
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
                  <span className="ml-3 text-xs text-white/40">jobtracker — Offres</span>
                </div>
                <div className="relative aspect-[16/10] w-full bg-[#0a0a0a]">
                  <Image
                    src="/landing/screen-jobs.png"
                    alt="Aperçu de JobTracker — offres et suivi"
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
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Comprends pourquoi une offre te correspond.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#eceae6]/65">
                Retrouve les points communs entre ton CV et le poste, les exigences non
                documentées et les améliorations à envisager avant de postuler.
              </p>
            </div>
            <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
              <div className="relative aspect-[16/11] w-full">
                <Image
                  src="/landing/screen-job-detail.png"
                  alt="Vue détaillée d’une offre : correspondance avec le CV, conseils et lettre de motivation."
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-[#eceae6]/55">
                Vue détaillée d’une offre : correspondance avec le CV, conseils et lettre
                de motivation.
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          id="comment-ca-marche"
          className="relative z-10 scroll-mt-8 px-5 py-20 md:px-8 md:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-5xl">
              De l’offre repérée à la candidature préparée.
            </h2>
            <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  className={cn(
                    "landing-step border-t border-[#111]/15 pt-6",
                    ready && "landing-step-in"
                  )}
                  style={{ animationDelay: `${0.12 + index * 0.08}s` }}
                >
                  <span className="font-[family-name:var(--font-landing-display)] text-sm text-[#111]/45">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-landing-display)] text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#111]/65">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="fonctionnalites"
          className="relative z-10 scroll-mt-8 border-t border-[#111]/10 bg-[#f5f3ef] px-5 py-20 md:px-8 md:py-28"
        >
          <div className="mx-auto max-w-6xl space-y-20 md:space-y-28">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Identifie tes points forts pour chaque poste.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  Un intitulé peut te correspondre sans que toutes les missions soient
                  adaptées à ton parcours. JobTracker compare le contenu de l’offre à ton
                  CV pour t’aider à décider où concentrer tes efforts.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#111]/75">
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Les compétences et expériences en commun.
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Les exigences que ton CV ne permet pas de confirmer.
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Des suggestions ciblées pour mieux présenter ton parcours.
                  </li>
                </ul>
                <p className="mt-5 text-sm italic text-[#111]/55">
                  Le score de correspondance est une aide à la lecture, pas une
                  probabilité d’embauche.
                </p>
              </div>
              <figure className="overflow-hidden rounded-xl border border-[#111]/12 bg-[#111] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-[16/11] w-full">
                  <Image
                    src="/landing/screen-job-detail.png"
                    alt="Comparaison CV et fiche de poste"
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
                    alt="Analyse et amélioration du CV"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </figure>
              <div className="order-1 lg:order-2">
                <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Sache quoi améliorer dans ton CV.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  Obtiens un retour sur la clarté de ton parcours, la structure du contenu
                  et la façon dont tu présentes tes réalisations. Repère les compétences
                  et les mots-clés à mieux mettre en valeur lorsqu’ils correspondent à ton
                  expérience.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#111]/75">
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Une évaluation de la lisibilité du contenu analysé.
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Des points forts et des améliorations expliqués.
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Des conseils pour rendre tes missions et tes résultats plus concrets.
                  </li>
                </ul>
                <p className="mt-5 text-sm italic text-[#111]/55">
                  L’analyse fournit des repères d’amélioration. Elle ne garantit pas le
                  passage d’un logiciel de recrutement.
                </p>
              </div>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Pars de ton expérience pour écrire ta lettre.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  Prépare un brouillon qui relie les besoins du poste aux éléments de ton
                  CV. Tu disposes d’une base adaptée à l’offre, à relire et à ajuster avec
                  tes mots.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#111]/75">
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Une accroche liée à la mission.
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Des arguments fondés sur ton parcours.
                  </li>
                  <li className="border-l-2 border-[#111]/20 pl-3">
                    Un texte que tu peux personnaliser avant de l’utiliser.
                  </li>
                </ul>
              </div>
              <figure className="overflow-hidden rounded-xl border border-[#111]/12 bg-[#111] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-[16/11] w-full">
                  <Image
                    src="/landing/screen-profile.png"
                    alt="Préparation d’une lettre de motivation"
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
                    src="/landing/screen-applications.png"
                    alt="Suivi des candidatures"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </figure>
              <div className="order-1 lg:order-2">
                <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Retrouve où tu en es, sans tout garder en tête.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  Une candidature à préparer, un entretien prévu, des notes à conserver :
                  rassemble les informations utiles pour chaque poste.
                </p>
                <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                  Mets à jour les statuts et retrouve ton activité depuis le tableau de
                  bord.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="extension"
          className="relative z-10 scroll-mt-8 px-5 py-20 md:px-8 md:py-28"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.16em] text-[#111]/5">
                Extension Chrome — optionnelle
              </p>
              <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Tu recherches sur Welcome to the Jungle ?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                L’extension JobTracker permet d’enregistrer les offres qui t’intéressent
                dans un fichier CSV. Importe ensuite ce fichier dans l’application pour
                les retrouver et les analyser.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[#111]/70">
                Tu peux aussi commencer directement en collant une offre dans JobTracker.
              </p>
              <div className="mt-8">
                <Link href="/extension" className={primaryCtaClass} tabIndex={0}>
                  Découvrir l’extension
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <p className="mt-4 text-sm italic text-[#111]/55">
                L’installation actuelle se fait en mode développeur sur Chrome ou Arc.
              </p>
            </div>
            <figure className="overflow-hidden rounded-xl border border-[#111]/12 bg-[#111] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.45)]">
              <div className="relative aspect-[16/11] w-full">
                <Image
                  src="/landing/screen-extension.png"
                  alt="Guide d’installation de l’extension Chrome"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </figure>
          </div>
        </section>

        <section
          id="faq"
          className="relative z-10 scroll-mt-8 border-t border-[#111]/10 bg-[#111] px-5 py-20 text-[#eceae6] md:px-8 md:py-28"
        >
          <div className="mx-auto max-w-3xl">
            <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              Questions fréquentes
            </h2>
            <ul className="mt-10 divide-y divide-[#eceae6]/15 border-t border-[#eceae6]/15">
              {FAQ.map((item, index) => {
                const isOpen = openFaq === index
                return (
                  <li key={item.q}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae6]"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span className="font-[family-name:var(--font-landing-display)] text-lg font-semibold md:text-xl">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-[#eceae6]/55 transition-transform",
                          isOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                    {isOpen ? (
                      <p className="pb-5 text-sm leading-relaxed text-[#eceae6]/65 md:text-base">
                        {item.a}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-24 pt-16 md:px-8 md:pt-20">
          <div className="landing-cta-panel mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 overflow-hidden bg-[#111] px-8 py-12 text-[#eceae6] md:flex-row md:items-center md:px-12 md:py-14">
            <div className="relative z-10 max-w-xl">
              <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Prépare ta prochaine candidature avec une vue claire.
              </h2>
              <p className="mt-3 text-[#eceae6]/65">
                Commence par ton CV, puis ajoute une offre pour comparer ton profil aux
                attentes du poste.
              </p>
              <p className="mt-4 text-sm text-[#eceae6]/55">
                Déjà un compte ?{" "}
                <Link href="/login" className="underline underline-offset-4 hover:text-[#eceae6]">
                  Se connecter
                </Link>
              </p>
            </div>
            <Link
              href="/login"
              className="relative z-10 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#eceae6] px-6 py-3 text-sm font-semibold text-[#111] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              tabIndex={0}
            >
              Commencer avec mon CV
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#111]/10 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-2">
            <p className="font-[family-name:var(--font-landing-display)] text-lg font-semibold text-[#111]">
              JobTracker
            </p>
            <p className="text-sm leading-relaxed text-[#111]/55">
              Prépare et suis tes candidatures Product Owner et Product Manager.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#111]/55"
            aria-label="Pied de page"
          >
            <Link href="/login" className="hover:text-[#111]" tabIndex={0}>
              Connexion
            </Link>
            <a href="#confidentialite" className="hover:text-[#111]" tabIndex={0}>
              Confidentialité
            </a>
            <a href="#conditions" className="hover:text-[#111]" tabIndex={0}>
              Conditions d’utilisation
            </a>
            <a href="mailto:hello@jobtracker.app" className="hover:text-[#111]" tabIndex={0}>
              Contact
            </a>
          </nav>
        </div>
        <div className="mx-auto mt-8 max-w-6xl space-y-4 border-t border-[#111]/10 pt-6 text-xs leading-relaxed text-[#111]/45">
          <p id="confidentialite" className="scroll-mt-8">
            <strong className="font-medium text-[#111]/60">Confidentialité —</strong>{" "}
            Tes CV, offres et candidatures restent dans ton compte. Les analyses IA
            s’appuient sur le contenu que tu fournis, sans inventer d’expérience.
          </p>
          <p id="conditions" className="scroll-mt-8">
            <strong className="font-medium text-[#111]/60">Conditions —</strong> JobTracker
            est un outil d’aide à la candidature. Les scores et suggestions sont
            indicatifs et ne remplacent pas ton jugement.
          </p>
        </div>
      </footer>
    </div>
  )
}
