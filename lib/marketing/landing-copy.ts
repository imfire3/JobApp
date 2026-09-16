export type LandingLocale = "fr" | "en"

export const LANDING_LOCALE_STORAGE_KEY = "jobtracker_landing_locale"

export type LandingCopy = {
  brand: string
  navLogin: string
  navSignup: string
  heroHeadline: string
  heroSub: string
  ctaSignup: string
  ctaLogin: string
  problemTitle: string
  problemBody: string
  problemPoints: [string, string, string, string]
  howTitle: string
  steps: [
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
  ]
  zoomTitle: string
  zoomSections: [string, string, string, string, string]
  zoomBody: string
  extensionTitle: string
  extensionBody: string
  extensionInstallTitle: string
  extensionInstallSteps: [string, string, string, string, string]
  extensionUseTitle: string
  extensionUseSteps: [string, string, string, string, string]
  extensionNote: string
  closingTitle: string
  closingBody: string
  localeFr: string
  localeEn: string
}

export const landingCopy: Record<LandingLocale, LandingCopy> = {
  fr: {
    brand: "JobTracker",
    navLogin: "Se connecter",
    navSignup: "Créer un compte",
    heroHeadline: "De l’offre scrapée à la candidature prête",
    heroSub:
      "Importe, score le fit avec ton CV, génère une cover letter — sans jongler entre Excel, WTTJ et ChatGPT.",
    ctaSignup: "Créer un compte",
    ctaLogin: "Se connecter",
    problemTitle: "Le vrai problème n’est pas de trouver des offres",
    problemBody:
      "C’est de les centraliser, décider lesquelles valent le coup, adapter son CV sans inventer, et écrire une lettre crédible — vite.",
    problemPoints: [
      "Onglets WTTJ / LinkedIn / Indeed",
      "Excel ou Notion pour le suivi",
      "ChatGPT hors contexte à chaque offre",
      "Candidatures au feeling",
    ],
    howTitle: "Le parcours",
    steps: [
      {
        title: "CV",
        body: "Compte + import CV. L’IA extrait structure, mots-clés ATS et manques.",
      },
      {
        title: "Import",
        body: "Offres via CSV / extension WTTJ. Dedup par URL.",
      },
      {
        title: "Triage",
        body: "Board Jobs + actions bulk : En cours, Archiver, Candidaté.",
      },
      {
        title: "Décision",
        body: "Fiche job : score fit, keywords, améliorations, cover letter.",
      },
      {
        title: "Pipeline",
        body: "Applications + dashboard KPI pour piloter le rythme.",
      },
    ],
    zoomTitle: "Le moment décision",
    zoomSections: [
      "Analyse CV",
      "Analyse poste",
      "Keywords match",
      "Amélios CV",
      "Cover letter",
    ],
    zoomBody: "Tu ne décides plus au feeling. Tu décides avec des preuves.",
    extensionTitle: "Ajoute l’extension Chrome",
    extensionBody:
      "Sur Welcome to the Jungle, l’extension JobTracker capture l’offre et l’ajoute à un seul fichier CSV — prêt à importer dans l’app.",
    extensionInstallTitle: "Installer (Chrome ou Arc)",
    extensionInstallSteps: [
      "Ouvre chrome://extensions (ou arc://extensions)",
      "Active le Mode développeur",
      "Clique Charger l’extension non empaquetée",
      "Sélectionne le dossier chrome-extension du projet",
      "Recharge l’extension si elle était déjà installée",
    ],
    extensionUseTitle: "Comment ça marche",
    extensionUseSteps: [
      "Ouvre une offre WTTJ (page job)",
      "Ouvre le panneau JobTracker (onglet ou icône)",
      "Lie ou crée une fois jobtracker-wttj-jobs.csv",
      "Clique Ajouter cette offre — le même fichier est mis à jour",
      "Importe ce CSV dans JobTracker → Imports",
    ],
    extensionNote:
      "Un seul fichier CSV, réécrit à chaque ajout — pas de dizaines d’exports. Puis Imports dans l’app pour scorer et candidater.",
    closingTitle: "Prêt à tester JobTracker ?",
    closingBody:
      "Objectif : aider plus de gens à trouver du travail, plus vite, avec moins de friction.",
    localeFr: "FR",
    localeEn: "EN",
  },
  en: {
    brand: "JobTracker",
    navLogin: "Log in",
    navSignup: "Create account",
    heroHeadline: "From scraped job to ready-to-send application",
    heroSub:
      "Import roles, score CV fit, generate a credible cover letter — without juggling tabs, spreadsheets, and ChatGPT.",
    ctaSignup: "Create account",
    ctaLogin: "Log in",
    problemTitle: "The hard part isn’t finding jobs",
    problemBody:
      "It’s centralizing them, knowing which ones are worth it, adapting your CV without inventing, and writing a credible letter — fast.",
    problemPoints: [
      "Tabs across WTTJ / LinkedIn / Indeed",
      "Spreadsheets or Notion for tracking",
      "ChatGPT out of context on every role",
      "Applications on gut feel",
    ],
    howTitle: "How it works",
    steps: [
      {
        title: "CV",
        body: "Sign up + import your CV. AI extracts structure, ATS keywords, and gaps.",
      },
      {
        title: "Import",
        body: "Jobs via CSV / WTTJ extension. Deduped by URL.",
      },
      {
        title: "Triage",
        body: "Jobs board + bulk actions: In progress, Archive, Applied.",
      },
      {
        title: "Decide",
        body: "Job page: fit score, keywords, CV upgrades, cover letter.",
      },
      {
        title: "Pipeline",
        body: "Applications + dashboard KPIs to keep your pace.",
      },
    ],
    zoomTitle: "The decision moment",
    zoomSections: [
      "CV analysis",
      "Job analysis",
      "Keyword match",
      "CV upgrades",
      "Cover letter",
    ],
    zoomBody: "Stop guessing. Decide with evidence.",
    extensionTitle: "Add the Chrome extension",
    extensionBody:
      "On Welcome to the Jungle, the JobTracker extension captures the job and appends it to one CSV file — ready to import into the app.",
    extensionInstallTitle: "Install (Chrome or Arc)",
    extensionInstallSteps: [
      "Open chrome://extensions (or arc://extensions)",
      "Turn on Developer mode",
      "Click Load unpacked",
      "Select the project’s chrome-extension folder",
      "Reload the extension if it was already installed",
    ],
    extensionUseTitle: "How it works",
    extensionUseSteps: [
      "Open a WTTJ job page",
      "Open the JobTracker panel (side panel or icon)",
      "Link or create jobtracker-wttj-jobs.csv once",
      "Click Add this job — the same file is updated",
      "Import that CSV in JobTracker → Imports",
    ],
    extensionNote:
      "One CSV file, rewritten on every add — no pile of exports. Then use Imports in the app to score and apply.",
    closingTitle: "Ready to try JobTracker?",
    closingBody:
      "Goal: help more people find work, faster, with less friction.",
    localeFr: "FR",
    localeEn: "EN",
  },
}

export const isLandingLocale = (value: unknown): value is LandingLocale =>
  value === "fr" || value === "en"

export const resolveLandingLocale = (stored: string | null): LandingLocale =>
  isLandingLocale(stored) ? stored : "fr"
