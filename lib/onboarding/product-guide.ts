export const PRODUCT_GUIDE_STORAGE_KEY = "jobapp_product_guide_v2"

/** Legacy key from the first product tour — treat as already seen. */
export const PRODUCT_GUIDE_LEGACY_STORAGE_KEY = "jobapp_product_tour_v1"

export type GuidePageId =
  | "dashboard"
  | "jobs"
  | "job-detail"
  | "applications"
  | "imports"
  | "extension"
  | "sources"
  | "cv"
  | "settings"

export type GuideStep = {
  id: string
  path: string
  target: string
  title: string
  body: string
  actionLabel?: string
  actionHref?: string
}

/** First visit: CV → import → matching → candidatures */
export const FIRST_VISIT_STEPS: GuideStep[] = [
  {
    id: "cv",
    path: "/profile-ai",
    target: "[data-tour='guide-cv-upload']",
    title: "Ton CV, le point de départ",
    body: "Ajoute ton CV pour obtenir des conseils d’amélioration et personnaliser tes candidatures.",
    actionLabel: "Ajouter mon CV",
    actionHref: "/profile-ai",
  },
  {
    id: "imports",
    path: "/imports",
    target: "[data-tour='guide-imports-paste']",
    title: "Ajoute tes premières offres",
    body: "Importe un fichier CSV ou Excel, ou colle le texte d’une offre. Vérifie les informations avant de les ajouter à tes offres suivies.",
    actionLabel: "Ajouter une offre",
    actionHref: "/imports",
  },
  {
    id: "matching",
    path: "/jobs",
    target: "[data-tour='guide-jobs-match']",
    title: "Repère les offres qui te correspondent",
    body: "Ce score compare les informations de ton CV aux exigences de l’offre. Consulte les points communs et les écarts pour décider si tu souhaites postuler.",
    actionLabel: "Explorer mes offres",
    actionHref: "/jobs",
  },
  {
    id: "applications",
    path: "/applications",
    target: "[data-tour='guide-applications-status']",
    title: "Garde le fil de tes candidatures",
    body: "Note où tu en es pour chaque poste. Ajoute tes dates d’entretien et tes notes pour préparer la suite.",
    actionLabel: "Ajouter une candidature",
    actionHref: "/applications",
  },
]

export const PAGE_GUIDE_STEPS: Record<GuidePageId, GuideStep[]> = {
  cv: [
    {
      id: "cv-intro",
      path: "/profile-ai",
      target: "[data-tour='guide-cv-upload']",
      title: "Commence par ton CV",
      body: "Importe ton CV en PDF ou colle son texte. Il servira de base pour analyser ton profil, comparer les offres et préparer tes lettres.",
      actionLabel: "Ajouter mon CV",
    },
    {
      id: "cv-analyze",
      path: "/profile-ai",
      target: "[data-tour='guide-cv-analyze']",
      title: "Analyse ton CV",
      body: "Découvre les points forts de ton CV et les améliorations possibles. Le score est un repère pour progresser, pas une garantie de passer les filtres de recrutement.",
    },
  ],
  imports: [
    {
      id: "imports-intro",
      path: "/imports",
      target: "[data-tour='guide-imports-form']",
      title: "Ajoute tes premières offres",
      body: "Importe un fichier CSV ou Excel, ou colle le texte d’une offre. Vérifie les informations avant de les ajouter à tes offres suivies.",
      actionLabel: "Ajouter une offre",
    },
    {
      id: "imports-paste",
      path: "/imports",
      target: "[data-tour='guide-imports-paste']",
      title: "Colle le contenu de l’offre",
      body: "Colle la description complète pour permettre une comparaison plus précise avec ton CV. Tu peux aussi ajouter le lien pour retrouver l’annonce.",
    },
  ],
  jobs: [
    {
      id: "jobs-intro",
      path: "/jobs",
      target: "[data-tour='guide-jobs-header']",
      title: "Repère les offres qui te correspondent",
      body: "Retrouve tes offres et filtre-les selon tes critères : lieu, télétravail, contrat ou score de correspondance.",
      actionLabel: "Explorer mes offres",
    },
    {
      id: "jobs-match",
      path: "/jobs",
      target: "[data-tour='guide-jobs-match']",
      title: "Score de correspondance",
      body: "Ce score compare les informations de ton CV aux exigences de l’offre. Consulte les points communs et les écarts pour décider si tu souhaites postuler.",
    },
    {
      id: "jobs-alert",
      path: "/jobs",
      target: "[data-tour='guide-jobs-alert']",
      title: "Nouvelle alerte",
      body: "Crée une recherche à suivre pour retrouver les offres qui correspondent à tes critères.",
    },
  ],
  "job-detail": [
    {
      id: "cover-letter",
      path: "/jobs",
      target: "[data-tour='guide-cover-letter']",
      title: "Une lettre adaptée à cette offre",
      body: "Prépare un premier brouillon à partir de ton CV et des besoins du poste. Relis-le et ajuste-le avant de l’utiliser.",
      actionLabel: "Préparer ma lettre",
    },
  ],
  applications: [
    {
      id: "applications-intro",
      path: "/applications",
      target: "[data-tour='guide-applications-form']",
      title: "Garde le fil de tes candidatures",
      body: "Note où tu en es pour chaque poste. Ajoute tes dates d’entretien et tes notes pour préparer la suite.",
      actionLabel: "Ajouter une candidature",
    },
    {
      id: "applications-status",
      path: "/applications",
      target: "[data-tour='guide-applications-status']",
      title: "Statut de candidature",
      body: "Indique l’étape actuelle de ta candidature pour retrouver facilement celles qui sont à préparer ou déjà en cours.",
    },
  ],
  dashboard: [
    {
      id: "dashboard-intro",
      path: "/dashboard",
      target: "[data-tour='guide-dashboard']",
      title: "Ta recherche, en un coup d’œil",
      body: "Retrouve un résumé de tes offres, de tes candidatures et de ton activité récente. Les indicateurs se remplissent au fil de ton utilisation.",
      actionLabel: "Voir mes offres",
      actionHref: "/jobs",
    },
  ],
  extension: [
    {
      id: "extension-intro",
      path: "/extension",
      target: "[data-tour='guide-extension']",
      title: "Récupère des offres pendant ta recherche",
      body: "L’extension permet d’enregistrer des offres Welcome to the Jungle dans un fichier CSV. Importe ensuite ce fichier dans JobTracker.",
      actionLabel: "Voir les étapes d’installation",
    },
  ],
  sources: [
    {
      id: "sources-intro",
      path: "/sources",
      target: "[data-tour='guide-sources']",
      title: "Choisis d’où viennent tes offres",
      body: "Cette page présente les services de collecte d’offres. Les connexions affichées sont actuellement en démonstration ; utilise les imports pour ajouter tes offres.",
      actionLabel: "Aller aux imports",
      actionHref: "/imports",
    },
  ],
  settings: [
    {
      id: "settings-intro",
      path: "/settings",
      target: "[data-tour='guide-settings']",
      title: "Adapte JobTracker à tes besoins",
      body: "Choisis la langue, le thème et les paramètres de l’assistant IA. Les options avancées permettent d’ajuster les analyses et les lettres.",
      actionLabel: "Compris",
    },
  ],
}

export const pathnameToGuidePage = (pathname: string): GuidePageId | null => {
  if (pathname.startsWith("/profile-ai")) return "cv"
  if (pathname.startsWith("/imports")) return "imports"
  if (pathname.match(/^\/jobs\/[^/]+/)) return "job-detail"
  if (pathname.startsWith("/jobs")) return "jobs"
  if (pathname.startsWith("/applications")) return "applications"
  if (pathname.startsWith("/dashboard")) return "dashboard"
  if (pathname.startsWith("/extension")) return "extension"
  if (pathname.startsWith("/sources")) return "sources"
  if (pathname.startsWith("/settings")) return "settings"
  return null
}

export const hasSeenProductGuide = (): boolean => {
  try {
    if (localStorage.getItem(PRODUCT_GUIDE_STORAGE_KEY) === "1") return true
    if (localStorage.getItem(PRODUCT_GUIDE_LEGACY_STORAGE_KEY) === "1") return true
    return false
  } catch {
    return false
  }
}

export const markProductGuideSeen = (): void => {
  try {
    localStorage.setItem(PRODUCT_GUIDE_STORAGE_KEY, "1")
  } catch {
    // ignore
  }
}

export const PRODUCT_GUIDE_EVENT = "jobapp:product-guide"

export type ProductGuideEventDetail =
  | { type: "first-visit" }
  | { type: "page"; pageId: GuidePageId }
  | { type: "steps"; steps: GuideStep[] }

export const requestProductGuide = (detail: ProductGuideEventDetail): void => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(PRODUCT_GUIDE_EVENT, { detail }))
}
