import { FRANCE_CITIES } from "@/lib/onboarding/france-cities"

/** French régions (métropole + outre-mer). */
export const FRANCE_REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "Guadeloupe",
  "Guyane",
  "Martinique",
  "Mayotte",
  "La Réunion",
] as const

/** French départements (noms). */
export const FRANCE_DEPARTMENTS = [
  "Ain",
  "Aisne",
  "Allier",
  "Alpes-de-Haute-Provence",
  "Hautes-Alpes",
  "Alpes-Maritimes",
  "Ardèche",
  "Ardennes",
  "Ariège",
  "Aube",
  "Aude",
  "Aveyron",
  "Bouches-du-Rhône",
  "Calvados",
  "Cantal",
  "Charente",
  "Charente-Maritime",
  "Cher",
  "Corrèze",
  "Corse-du-Sud",
  "Haute-Corse",
  "Côte-d'Or",
  "Côtes-d'Armor",
  "Creuse",
  "Dordogne",
  "Doubs",
  "Drôme",
  "Eure",
  "Eure-et-Loir",
  "Finistère",
  "Gard",
  "Haute-Garonne",
  "Gers",
  "Gironde",
  "Hérault",
  "Ille-et-Vilaine",
  "Indre",
  "Indre-et-Loire",
  "Isère",
  "Jura",
  "Landes",
  "Loir-et-Cher",
  "Loire",
  "Haute-Loire",
  "Loire-Atlantique",
  "Loiret",
  "Lot",
  "Lot-et-Garonne",
  "Lozère",
  "Maine-et-Loire",
  "Manche",
  "Marne",
  "Haute-Marne",
  "Mayenne",
  "Meurthe-et-Moselle",
  "Meuse",
  "Morbihan",
  "Moselle",
  "Nièvre",
  "Nord",
  "Oise",
  "Orne",
  "Pas-de-Calais",
  "Puy-de-Dôme",
  "Pyrénées-Atlantiques",
  "Hautes-Pyrénées",
  "Pyrénées-Orientales",
  "Bas-Rhin",
  "Haut-Rhin",
  "Rhône",
  "Haute-Saône",
  "Saône-et-Loire",
  "Sarthe",
  "Savoie",
  "Haute-Savoie",
  "Paris",
  "Seine-Maritime",
  "Seine-et-Marne",
  "Yvelines",
  "Deux-Sèvres",
  "Somme",
  "Tarn",
  "Tarn-et-Garonne",
  "Var",
  "Vaucluse",
  "Vendée",
  "Vienne",
  "Haute-Vienne",
  "Vosges",
  "Yonne",
  "Territoire de Belfort",
  "Essonne",
  "Hauts-de-Seine",
  "Seine-Saint-Denis",
  "Val-de-Marne",
  "Val-d'Oise",
] as const

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  )
}

/** Locations for alert picker: France + régions + départements + grandes villes. */
export const SEARCH_LOCATIONS_FR: string[] = uniqueSorted([
  "France",
  "Remote",
  ...FRANCE_REGIONS,
  ...FRANCE_DEPARTMENTS,
  ...FRANCE_CITIES,
])

export type CatalogOption = { value: string; label: string }

export const SEARCH_LANGUAGES: CatalogOption[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "es", label: "Espagnol" },
  { value: "de", label: "Allemand" },
  { value: "it", label: "Italien" },
  { value: "pt", label: "Portugais" },
  { value: "nl", label: "Néerlandais" },
  { value: "ar", label: "Arabe" },
  { value: "zh", label: "Chinois" },
  { value: "ja", label: "Japonais" },
]

export const SEARCH_EXPERTISES: CatalogOption[] = [
  { value: "product", label: "Produit" },
  { value: "engineering", label: "Tech / Engineering" },
  { value: "data", label: "Data" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Sales / Business" },
  { value: "customer_success", label: "Customer Success" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "RH / People" },
  { value: "legal", label: "Legal" },
  { value: "ops", label: "Ops / Supply" },
  { value: "support", label: "Support" },
  { value: "growth", label: "Growth" },
  { value: "ai", label: "IA / ML" },
  { value: "security", label: "Sécurité" },
  { value: "devops", label: "DevOps / Infra" },
]

export const SEARCH_CONTRACT_TYPES: CatalogOption[] = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Freelance", label: "Freelance / TJM" },
  { value: "Stage", label: "Stage" },
  { value: "Alternance", label: "Alternance" },
  { value: "Interim", label: "Intérim" },
  { value: "VIE", label: "VIE" },
]

export const SEARCH_REMOTE_OPTIONS: CatalogOption[] = [
  { value: "any", label: "Tous types" },
  { value: "onsite", label: "Présentiel" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote_only", label: "Full remote" },
]

export const SEARCH_START_DATE: CatalogOption[] = [
  { value: "asap", label: "Dès que possible" },
  { value: "1_month", label: "Sous 1 mois" },
  { value: "3_months", label: "Sous 3 mois" },
  { value: "flexible", label: "Flexible" },
]

export const SEARCH_PUBLISH_WINDOW: CatalogOption[] = [
  { value: "1", label: "Dernières 24 h" },
  { value: "7", label: "7 derniers jours" },
  { value: "14", label: "14 derniers jours" },
  { value: "30", label: "30 derniers jours" },
]

export const SEARCH_SALARY_PERIODS: CatalogOption[] = [
  { value: "year", label: "Salaire annuel" },
  { value: "day", label: "TJM (jour)" },
]

/** Filter catalog labels/values by free-text query (accent-insensitive). */
export function filterCatalogOptions(
  options: CatalogOption[] | string[],
  query: string
): CatalogOption[] {
  const normalized = options.map((item) =>
    typeof item === "string" ? { value: item, label: item } : item
  )
  const q = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
  if (!q) return normalized
  return normalized.filter((opt) => {
    const hay = `${opt.label} ${opt.value}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
    return hay.includes(q)
  })
}

/** Map app contract labels to common Apify/WTTJ actor enums. */
export function mapContractTypesForActor(contracts: string[]): string[] {
  const mapped: string[] = []
  for (const value of contracts) {
    const key = value.toLowerCase()
    if (key.includes("cdi") || key.includes("full")) mapped.push("full_time")
    else if (key.includes("cdd") || key.includes("temporary")) mapped.push("temporary")
    else if (key.includes("freelance") || key.includes("tjm")) mapped.push("freelance")
    else if (key.includes("stage") || key.includes("intern")) mapped.push("internship")
    else if (key.includes("altern") || key.includes("apprent")) mapped.push("apprenticeship")
    else if (key.includes("interim")) mapped.push("temporary")
    else mapped.push(value)
  }
  return [...new Set(mapped)]
}

/** Map remote preference to actor remoteTypes. */
export function mapRemoteForActor(remotePreference: string): string[] {
  switch (remotePreference) {
    case "remote_only":
    case "remote":
      return ["fulltime"]
    case "hybrid":
      return ["partial"]
    case "onsite":
    case "on_site":
      return ["no"]
    default:
      return []
  }
}
