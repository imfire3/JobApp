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

export type PageHelpTip = {
  id: string
  title: string
  body: string
}

export const PAGE_HELP: Record<GuidePageId, { title: string; tips: PageHelpTip[] }> = {
  cv: {
    title: "Mon CV",
    tips: [
      {
        id: "cv-intro",
        title: "Commence par ton CV",
        body: "Importe ton CV en PDF ou colle son texte. Il servira de base pour analyser ton profil, comparer les offres et préparer tes lettres.",
      },
      {
        id: "cv-analyze",
        title: "Analyse ton CV",
        body: "Découvre les points forts de ton CV et les améliorations possibles. Le score est un repère pour progresser, pas une garantie de passer les filtres de recrutement.",
      },
    ],
  },
  imports: {
    title: "Imports",
    tips: [
      {
        id: "imports-intro",
        title: "Ajoute tes premières offres",
        body: "Importe un fichier CSV ou Excel, ou colle le texte d’une offre. Vérifie les informations avant de les ajouter à tes offres suivies.",
      },
      {
        id: "imports-paste",
        title: "Colle le contenu de l’offre",
        body: "Colle la description complète pour permettre une comparaison plus précise avec ton CV. Tu peux aussi ajouter le lien pour retrouver l’annonce.",
      },
    ],
  },
  jobs: {
    title: "Offres",
    tips: [
      {
        id: "jobs-intro",
        title: "Repère les offres qui te correspondent",
        body: "Retrouve tes offres et filtre-les selon tes critères : lieu, télétravail, contrat ou score de correspondance.",
      },
      {
        id: "jobs-match",
        title: "Score de correspondance",
        body: "Ce score compare les informations de ton CV aux exigences de l’offre. Consulte les points communs et les écarts pour décider si tu souhaites postuler.",
      },
      {
        id: "jobs-alert",
        title: "Nouvelle alerte",
        body: "Crée une recherche à suivre pour retrouver les offres qui correspondent à tes critères.",
      },
      {
        id: "jobs-csv",
        title: "Importer un CSV",
        body: "Clique sur Importer CSV, choisis ton fichier, et les offres sont ajoutées tout de suite. L’analyse de match se lance automatiquement sur chaque carte.",
      },
    ],
  },
  "job-detail": {
    title: "Détail de l’offre",
    tips: [
      {
        id: "cover-letter",
        title: "Une lettre adaptée à cette offre",
        body: "Prépare un premier brouillon à partir de ton CV et des besoins du poste. Relis-le et ajuste-le avant de l’utiliser.",
      },
    ],
  },
  applications: {
    title: "Candidatures",
    tips: [
      {
        id: "applications-intro",
        title: "Garde le fil de tes candidatures",
        body: "Note où tu en es pour chaque poste. Ajoute tes dates d’entretien et tes notes pour préparer la suite.",
      },
      {
        id: "applications-status",
        title: "Statut de candidature",
        body: "Indique l’étape actuelle de ta candidature pour retrouver facilement celles qui sont à préparer ou déjà en cours.",
      },
    ],
  },
  dashboard: {
    title: "Tableau de bord",
    tips: [
      {
        id: "dashboard-intro",
        title: "Ta recherche, en un coup d’œil",
        body: "Retrouve un résumé de tes offres, de tes candidatures et de ton activité récente. Les indicateurs se remplissent au fil de ton utilisation.",
      },
    ],
  },
  extension: {
    title: "Extension",
    tips: [
      {
        id: "extension-intro",
        title: "Récupère des offres pendant ta recherche",
        body: "L’extension permet d’enregistrer des offres Welcome to the Jungle dans un fichier CSV. Importe ensuite ce fichier dans JobTracker.",
      },
    ],
  },
  sources: {
    title: "Sources",
    tips: [
      {
        id: "sources-intro",
        title: "Choisis d’où viennent tes offres",
        body: "Cette page présente les services de collecte d’offres. Les connexions affichées sont actuellement en démonstration ; utilise les imports pour ajouter tes offres.",
      },
    ],
  },
  settings: {
    title: "Réglages",
    tips: [
      {
        id: "settings-intro",
        title: "Adapte JobTracker à tes besoins",
        body: "Choisis la langue, le thème et les paramètres de l’assistant IA. Les options avancées permettent d’ajuster les analyses et les lettres.",
      },
    ],
  },
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
