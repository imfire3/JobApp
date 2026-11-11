"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { DemoRequestDialog } from "@/components/landing/demo-request-dialog"

const steps = [
  {
    number: "01",
    title: "Ajoute ton CV",
    text: "Importe ton PDF ou colle son texte. Ton expérience sert de base aux analyses et aux lettres.",
  },
  {
    number: "02",
    title: "Importe tes offres",
    text: "Colle une description, importe un CSV ou Excel, un JSON Apify, ou capture une offre avec l’extension.",
  },
  {
    number: "03",
    title: "Compare et prépare",
    text: "Consulte les correspondances et les pistes d’amélioration, puis prépare une lettre à relire.",
  },
  {
    number: "04",
    title: "Suis la suite",
    text: "Mets à jour les statuts, note tes entretiens et retrouve ton activité sur le tableau de bord.",
  },
] as const

const features = [
  {
    id: "importer",
    title: "Importe tes offres sans perdre le fil.",
    body: "Centralise les postes qui t’intéressent : collage manuel, fichier CSV ou Excel, JSON Apify, ou export de l’extension Chrome. Prévisualise, déduplique, puis retrouve tout dans ton board.",
    bullets: [
      "Collage d’une offre avec URL et description.",
      "Import CSV / Excel prêt à analyser.",
      "Import JSON Apify pour les lots déjà collectés.",
    ],
    image: "/landing/figma-offers-import.png",
    alt: "Écran d’import JobTracker pour les offres CSV et Excel",
  },
  {
    id: "comprendre",
    title: "Comprends pourquoi une offre te correspond.",
    body: "Un intitulé peut te correspondre sans que toutes les missions soient adaptées à ton parcours. JobTracker compare le contenu de l’offre à ton CV pour t’aider à décider où concentrer tes efforts.",
    bullets: [
      "Les compétences et expériences en commun.",
      "Les exigences que ton CV ne permet pas de confirmer.",
      "Des suggestions ciblées pour mieux présenter ton parcours.",
    ],
    note: "Le score de correspondance est une aide à la lecture, pas une probabilité d’embauche.",
    image: "/landing/figma-offer-analysis.png",
    alt: "Analyse d’une offre avec critères, correspondances et points à confirmer",
    dark: true,
  },
  {
    id: "cv",
    title: "Sache quoi améliorer dans ton CV.",
    body: "Obtiens un retour sur la clarté de ton parcours, la structure du contenu et la façon dont tu présentes tes réalisations. Repère les compétences et les mots-clés à mieux mettre en valeur lorsqu’ils correspondent à ton expérience.",
    bullets: [
      "Une évaluation de la lisibilité du contenu analysé.",
      "Des points forts et des améliorations expliqués.",
      "Des conseils pour rendre tes missions et tes résultats plus concrets.",
    ],
    note: "L’analyse fournit des repères d’amélioration. Elle ne garantit pas le passage d’un logiciel de recrutement.",
    image: "/landing/screen-optimize.png",
    alt: "Écran JobTracker d’analyse et d’optimisation du CV",
  },
  {
    id: "profil",
    title: "Garde ton profil à jour pour de meilleures analyses.",
    body: "Ton CV et ton contexte — expériences, compétences et préférences — servent de source aux scores, aux suggestions et aux lettres. Plus le profil est clair, plus les retours sont utiles.",
    bullets: [
      "Import PDF ou collage de texte.",
      "Expériences et compétences structurées.",
      "Une base commune pour les analyses et les lettres.",
    ],
    image: "/landing/screen-profile.png",
    alt: "Profil JobTracker avec CV, expériences et compétences",
  },
  {
    id: "lettre",
    title: "Pars de ton expérience pour écrire ta lettre.",
    body: "Prépare un brouillon qui relie les besoins du poste aux éléments de ton CV. Tu disposes d’une base adaptée à l’offre, à relire et à ajuster avec tes mots. Tu peux aussi générer plusieurs lettres en lot depuis le board.",
    bullets: [
      "Une accroche liée à la mission.",
      "Des arguments fondés sur ton parcours.",
      "Un texte à personnaliser avant de l’utiliser.",
    ],
    image: "/landing/screen-cover-letter.png",
    alt: "Brouillon de lettre de motivation lié à une offre et au CV",
  },
  {
    id: "suivi",
    title: "Retrouve où tu en es, sans tout garder en tête.",
    body: "Rassemble les informations utiles pour chaque poste. Mets à jour les statuts et retrouve ton activité depuis le tableau de bord.",
    bullets: [
      "Pipeline de candidatures avec statuts.",
      "Notes et dates d’entretien.",
      "Vue d’ensemble sur le tableau de bord.",
    ],
    image: "/landing/screen-applications.png",
    alt: "Vue du suivi des candidatures dans JobTracker",
  },
] as const

const questions = [
  {
    question: "À qui s’adresse JobTracker ?",
    answer:
      "JobTracker est pensé pour les Product Owners et Product Managers qui préparent plusieurs candidatures et veulent garder leur CV, leurs offres et leur suivi au même endroit.",
  },
  {
    question: "Comment j’ajoute des offres ?",
    answer:
      "Tu peux coller une offre, importer un fichier CSV ou Excel, charger un export JSON Apify ou utiliser l’extension Chrome pour les offres prises en charge.",
  },
  {
    question: "Est-ce que l’extension est obligatoire ?",
    answer:
      "Non. Tu peux commencer en collant une offre ou en important un fichier. L’extension est une option pour enregistrer certaines offres depuis ton navigateur.",
  },
  {
    question: "Quelle différence entre l’analyse du CV et le score de correspondance ?",
    answer:
      "L’analyse du CV aide à examiner la clarté et le contenu de ton profil. Le score compare les éléments disponibles dans ton CV à une offre précise.",
  },
  {
    question: "Le score ATS garantit-il que mon CV sera retenu ?",
    answer:
      "Non. C’est un repère fondé sur les critères disponibles, pas une prédiction de la décision d’un logiciel de recrutement ou d’un recruteur.",
  },
  {
    question: "Dois-je ajouter tous les mots-clés suggérés ?",
    answer:
      "Non. Garde uniquement les compétences et expériences qui correspondent réellement à ton parcours. Les suggestions ne doivent pas créer de faits nouveaux.",
  },
  {
    question: "La lettre est-elle prête à envoyer ?",
    answer:
      "C’est un brouillon à relire. Vérifie les faits, les formulations et les détails de l’entreprise, puis personnalise-le avant tout envoi.",
  },
] as const

function ProductScreenshot({
  src,
  alt,
  caption,
  priority = false,
  aspect = "feature",
}: {
  src: string
  alt: string
  caption?: string
  priority?: boolean
  aspect?: "hero" | "feature"
}) {
  return (
      <figure className="w-full min-w-0">
      <div className={`relative overflow-hidden rounded-[8px] border border-black/15 bg-[#111] shadow-landing ${aspect === "hero" ? "aspect-[1.71]" : "aspect-[1.64]"}`}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes={aspect === "hero"
            ? "(max-width: 768px) 100vw, 1920px"
            : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 620px"}
          className="object-cover object-top"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm leading-6 text-landing-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

function FeatureRow({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const copy = (
    <div className="min-w-0">
      <h3 className="max-w-[548px] font-landing-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] sm:text-4xl">
        {feature.title}
      </h3>
      <p className="mt-4 max-w-[548px] text-base leading-[26px] text-current/75">
        {feature.body}
      </p>
      <ul className="mt-6 space-y-3 text-base leading-6">
        {feature.bullets.map((bullet) => (
          <li key={bullet} className="border-l-2 border-current/25 pl-3">
            {bullet}
          </li>
        ))}
      </ul>
      {"note" in feature && feature.note ? (
        <p className="mt-5 max-w-[548px] text-base italic leading-6 text-current/70">
          {feature.note}
        </p>
      ) : null}
    </div>
  )

  const image = (
    <ProductScreenshot
      src={feature.image}
      alt={feature.alt}
      caption={feature.id === "comprendre" ? "Score, points communs et écarts avant de postuler." : undefined}
    />
  )

  if ("dark" in feature && feature.dark) {
    return (
      <article className="grid items-center gap-8 rounded-[8px] bg-[#111] p-5 text-[#eceae6] sm:p-8 lg:grid-cols-2 lg:gap-4">
        {copy}
        {image}
      </article>
    )
  }

  const imageFirst = index % 2 === 1
  return (
    <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-4 lg:px-8">
      {imageFirst ? <div className="lg:order-first">{image}</div> : null}
      <div className={imageFirst ? "lg:order-last" : ""}>{copy}</div>
      {!imageFirst ? image : null}
    </article>
  )
}

export function LandingPage({
  signupOpen = true,
  demoEnabled = false,
}: {
  signupOpen?: boolean
  demoEnabled?: boolean
} = {}) {
  const signupHref = signupOpen ? "/login?signup=1" : "/acces"
  const signupLabel = signupOpen ? "Créer mon compte" : "Demander un accès"
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <div id="top" className="landing-page min-h-screen overflow-x-hidden bg-landing-paper font-sans text-landing-ink">
      <a
        href="#contenu"
        className="sr-only z-50 min-h-11 items-center rounded-md bg-landing-surface px-4 py-3 text-landing-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink"
      >
        Aller au contenu
      </a>

      <header className="border-b border-landing-line">
        <div className="mx-auto flex min-h-20 max-w-[1254px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 sm:px-8 lg:px-0">
          <a
            href="#top"
            className="inline-flex min-h-11 items-center rounded-sm font-landing-display text-xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-landing-ink"
          >
            JobTracker
          </a>
          <nav aria-label="Navigation principale" className="order-3 w-full md:order-2 md:w-auto">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-landing-muted sm:gap-x-6">
              <li><a className="inline-flex min-h-10 items-center underline-offset-4 hover:text-landing-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink" href="#comment-ca-marche">Comment ça marche</a></li>
              <li><a className="inline-flex min-h-10 items-center underline-offset-4 hover:text-landing-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink" href="#fonctionnalites">Fonctionnalités</a></li>
              <li><a className="inline-flex min-h-10 items-center underline-offset-4 hover:text-landing-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink" href="#extension">Extension</a></li>
              <li><a className="inline-flex min-h-10 items-center underline-offset-4 hover:text-landing-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink" href="#questions">Questions fréquentes</a></li>
            </ul>
          </nav>
          <div className="order-2 flex items-center gap-4 md:order-3">
            {demoEnabled && !signupOpen ? (
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="hidden min-h-11 items-center text-sm font-medium text-landing-muted hover:text-landing-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink sm:inline-flex"
              >
                Demander un accès démo
              </button>
            ) : null}
            <Link href="/login" className="hidden min-h-11 items-center text-sm font-medium text-landing-muted hover:text-landing-ink sm:inline-flex">Se connecter</Link>
            <Link href={signupHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#0a0a0a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink motion-reduce:transition-none">
              {signupLabel}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        <section className="px-5 pb-16 pt-6 sm:px-8 sm:pb-20 lg:px-0">
          <div className="mx-auto flex max-w-[1254px] flex-col items-start gap-8">
            <div className="w-full">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-landing-muted sm:text-sm">
                Pour les Product Owners et Product Managers
              </p>
              <h1 className="mt-2 max-w-[1254px] font-landing-display text-[clamp(2.5rem,5vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.04em]">
                Tes offres, ton CV, tes candidatures. Au même endroit.
              </h1>
              <p className="mt-4 max-w-[627px] text-base leading-[1.65] text-landing-muted sm:text-lg">
                JobTracker est un CRM de candidature : importe tes offres, compare-les à ton CV, génère une lettre adaptée à chaque poste, puis suis ton pipeline jusqu’aux entretiens.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="#comment-ca-marche" className="inline-flex min-h-12 items-center justify-center rounded-[8px] border border-landing-ink bg-transparent px-4 text-sm font-medium text-landing-ink transition-colors hover:bg-[#d9d7d2] hover:text-landing-ink active:bg-[#d0cdc7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink motion-reduce:transition-none">
                Voir comment ça marche
              </a>
              <Link href={signupHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#0a0a0a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink motion-reduce:transition-none">
                {signupLabel} <span aria-hidden>↗</span>
              </Link>
            </div>
            <ProductScreenshot
              src="/landing/screen-dashboard-landing.png"
              alt="Aperçu du tableau de bord JobTracker et de son suivi de candidatures"
              priority
              aspect="hero"
            />
          </div>
        </section>

        <section id="comment-ca-marche" className="scroll-mt-6 border-y border-landing-line bg-landing-paper px-5 py-16 sm:px-8 sm:py-20 lg:px-0">
          <div className="mx-auto max-w-[1254px]">
            <h2 className="max-w-[768px] font-landing-display text-3xl leading-tight font-semibold tracking-[-0.025em] sm:text-5xl">
              De l’offre repérée à la candidature préparée.
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <li key={step.number} className="border-t border-landing-muted/70 pt-4">
                  <p className="text-sm text-landing-muted">{step.number}</p>
                  <h3 className="mt-3 font-landing-display text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-base leading-6 text-landing-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="fonctionnalites" className="scroll-mt-6 bg-landing-soft px-5 py-16 sm:px-8 sm:py-24 lg:px-0">
          <div className="mx-auto max-w-[1318px] space-y-16 sm:space-y-24">
            {features.map((feature, index) => (
              <FeatureRow key={feature.id} feature={feature} index={index} />
            ))}
          </div>
        </section>

        <section id="extension" className="scroll-mt-6 border-y border-landing-line bg-landing-paper px-5 py-16 sm:px-8 sm:py-20 lg:px-0">
          <div className="mx-auto max-w-[1254px]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-landing-muted sm:text-sm">Extension Chrome — optionnelle</p>
            <h2 className="mt-3 max-w-[768px] font-landing-display text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Tu recherches sur Welcome to the Jungle ou Indeed ?
            </h2>
            <div className="mt-8 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4 text-base leading-7 text-landing-muted">
                <p>L’extension JobTracker enregistre les offres prises en charge dans un fichier CSV, puis tu peux les importer pour les retrouver et les analyser.</p>
                <p>Tu peux aussi commencer directement en collant une offre ou en important un fichier CSV ou Excel.</p>
                <p className="text-sm italic">L’installation actuelle se fait en mode développeur sur Chrome ou Arc.</p>
              </div>
              <ProductScreenshot src="/landing/figma-extension.png" alt="Instructions d’installation de l’extension Chrome JobTracker" />
            </div>
          </div>
        </section>

        <section id="questions" className="scroll-mt-6 bg-[#111] px-5 py-16 text-[#eceae6] sm:px-8 sm:py-20 lg:px-0">
          <div className="mx-auto max-w-[1254px]">
            <h2 className="font-landing-display text-3xl font-semibold tracking-tight sm:text-5xl">Questions fréquentes</h2>
            <div className="mt-8 divide-y divide-[#eceae6]/20 border-y border-[#eceae6]/20">
              {questions.map((item, index) => (
                <details key={item.question} className="group py-1" open={index === 0}>
                  <summary className="flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-5 rounded-sm text-left text-base font-medium leading-6 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden sm:text-lg">
                    {item.question}
                    <span aria-hidden="true" className="shrink-0 font-mono text-xl text-[#a1a1a1] transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
                  </summary>
                  <p className="max-w-4xl pb-4 text-sm leading-6 text-[#c4c4c4] sm:text-base">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-landing-paper px-5 py-16 sm:px-8 sm:py-20 lg:px-0">
          <div className="mx-auto max-w-[1318px] rounded-[16px] bg-[#111] p-6 text-[#eceae6] sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-10" style={{ backgroundImage: "radial-gradient(circle at 88% 50%, rgba(255,255,255,0.12), transparent 36%)" }}>
            <div className="max-w-[576px]">
              <h2 className="font-landing-display text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
                Prépare ta prochaine candidature avec une vue claire.
              </h2>
              <p className="mt-4 text-base leading-7 text-[#c4c4c4]">
                Importe ton CV, ajoute une offre, compare ton profil et prépare une lettre à relire avant l’envoi.
              </p>
            </div>
            <Link href={signupHref} className="mt-6 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-white px-5 text-sm font-medium text-[#111] transition-colors hover:bg-[#e5e5e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white motion-reduce:transition-none lg:mt-0">
              {signupLabel} <span aria-hidden>↗</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-landing-paper px-5 pb-8 sm:px-8 lg:px-0">
        <div className="mx-auto max-w-[1254px] border-t border-landing-line pt-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="max-w-sm">
              <p className="font-landing-display text-base font-semibold">JobTracker</p>
              <p className="mt-2 text-sm leading-6 text-landing-muted">Prépare et suis tes candidatures Product Owner et Product Manager.</p>
            </div>
            <nav aria-label="Navigation de pied de page" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-landing-muted">
              <Link href="/login" className="underline-offset-4 hover:text-landing-ink hover:underline">Connexion</Link>
              <Link href={signupHref} className="underline-offset-4 hover:text-landing-ink hover:underline">{signupLabel}</Link>
              <a href="#confidentialite" className="underline-offset-4 hover:text-landing-ink hover:underline">Confidentialité</a>
              <a href="#conditions" className="underline-offset-4 hover:text-landing-ink hover:underline">Conditions d’utilisation</a>
              <a href="mailto:hello@jobtracker.app" className="underline-offset-4 hover:text-landing-ink hover:underline">Contact</a>
            </nav>
          </div>
          <div className="mt-8 space-y-3 border-t border-landing-line pt-5 text-xs leading-5 text-landing-muted">
            <p id="confidentialite" className="scroll-mt-6">Confidentialité — Les CV, offres et candidatures sont associés à ton compte. Vérifie les informations et les suggestions avant de les utiliser.</p>
            <p id="conditions" className="scroll-mt-6">Conditions — JobTracker est un outil d’aide à la candidature. Les scores et analyses sont des repères ; ils ne prédisent pas les décisions des recruteurs ou des logiciels.</p>
          </div>
        </div>
      </footer>

      {demoEnabled ? (
        <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      ) : null}
    </div>
  )
}
