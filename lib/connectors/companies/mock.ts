import type { CompanyCandidate, CompanySearchCriteria } from "@/types"

type MockCompanySeed = Omit<
  CompanyCandidate,
  "remote_ok" | "sector" | "size_min" | "size_max" | "headquarters"
> & {
  remote_ok: boolean
  sector: string
  size_min: number | null
  size_max: number | null
  headquarters: string | null
  locations: string[]
}

const MOCK_COMPANIES: MockCompanySeed[] = [
  {
    name: "Qonto",
    domain: "qonto.com",
    website: "https://qonto.com",
    sector: "Fintech",
    size_min: 500,
    size_max: 1000,
    headquarters: "Paris",
    locations: ["Paris", "Remote France", "Lyon"],
    remote_ok: true,
    description:
      "Neobanque B2B française : comptes pro, cartes, facturation pour PME et indépendants.",
    discovery_type: "offer_detected",
    sourceUrl: "https://qonto.com",
    reasons: ["Banque B2B", "Scale-up produit", "Présence remote"],
  },
  {
    name: "PayFit",
    domain: "payfit.com",
    website: "https://payfit.com",
    sector: "SaaS",
    size_min: 500,
    size_max: 1000,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Logiciel de paie et de gestion RH pour PME, éditeur SaaS en forte croissance.",
    discovery_type: "spontaneous",
    sourceUrl: "https://payfit.com",
    reasons: ["SaaS RH", "Produit B2B", "Scale-up"],
  },
  {
    name: "Swile",
    domain: "swile.com",
    website: "https://swile.co",
    sector: "Fintech",
    size_min: 250,
    size_max: 500,
    headquarters: "Montpellier",
    locations: ["Montpellier", "Paris", "Remote France"],
    remote_ok: true,
    description:
      "Titres-restaurant et avantages salariés (crédit souhaitable), scale-up mêlant fintech et produits RH.",
    discovery_type: "spontaneous",
    sourceUrl: "https://swile.co",
    reasons: ["Fintech RH", "Produit grand compte B2B", "Croissance"],
  },
  {
    name: "Spendesk",
    domain: "spendesk.com",
    website: "https://spendesk.com",
    sector: "Fintech",
    size_min: 200,
    size_max: 500,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Plateforme de gestion des dépenses et cartes d’entreprise pour finance teams.",
    discovery_type: "spontaneous",
    sourceUrl: "https://spendesk.com",
    reasons: ["Fintech dépenses", "B2B finance", "Produit full-stack"],
  },
  {
    name: "Libeo",
    domain: "libeo.io",
    website: "https://libeo.io",
    sector: "Fintech",
    size_min: 50,
    size_max: 200,
    headquarters: "Paris",
    locations: ["Paris", "Bordeaux", "Remote France"],
    remote_ok: true,
    description:
      "Automatisation du cycle fournisseurs (facturation, paiement) pour PME via comptabilité connectée.",
    discovery_type: "spontaneous",
    sourceUrl: "https://libeo.io",
    reasons: ["Fintech B2B", "PME", "Automatisation produit"],
  },
  {
    name: "Pennylane",
    domain: "pennylane.com",
    website: "https://pennylane.com",
    sector: "SaaS",
    size_min: 250,
    size_max: 500,
    headquarters: "Paris",
    locations: ["Paris", "Remote France", "Nantes"],
    remote_ok: true,
    description:
      "Super app comptable pour expert-comptable et PME : données financières temps réel.",
    discovery_type: "spontaneous",
    sourceUrl: "https://pennylane.com",
    reasons: ["SaaS finance", "Produit data", "Scale-up"],
  },
  {
    name: "Agicap",
    domain: "agicap.com",
    website: "https://agicap.com",
    sector: "Fintech",
    size_min: 100,
    size_max: 250,
    headquarters: "Lyon",
    locations: ["Lyon", "Remote France", "Paris"],
    remote_ok: true,
    description:
      "Solution de trésorerie et prévisionnel de cashflow pour PME et ETI.",
    discovery_type: "spontaneous",
    sourceUrl: "https://agicap.com",
    reasons: ["Fintech trésorerie", "B2B PME", "Croissance rapide"],
  },
  {
    name: "Monext",
    domain: "monext.fr",
    website: "https://www.monext.fr",
    sector: "Paiement",
    size_min: 200,
    size_max: 500,
    headquarters: "Aix-en-Provence",
    locations: ["Aix-en-Provence", "Paris", "Marseille"],
    remote_ok: false,
    description:
      "Établissement de paiement filiale du Crédit Mutuel Arkéa : encaissement et paiement pour commerçants.",
    discovery_type: "offer_detected",
    sourceUrl: "https://www.monext.fr",
    reasons: ["Paiement", "Banque", "Marseille / Aix"],
  },
  {
    name: "Alma",
    domain: "alma.health",
    website: "https://alma.health",
    sector: "Healthtech",
    size_min: 250,
    size_max: 500,
    headquarters: "Paris",
    locations: ["Paris", "Remote France", "Lyon"],
    remote_ok: true,
    description:
      "Réseau d’accès aux soins psychologiques, plateforme de santé mentale pour salariés.",
    discovery_type: "spontaneous",
    sourceUrl: "https://alma.health",
    reasons: ["Healthtech B2B", "Impact social", "Produit digital"],
  },
  {
    name: "Malt",
    domain: "malt.com",
    website: "https://www.malt.fr",
    sector: "Marketplace",
    size_min: 500,
    size_max: 1000,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Place de marché de freelances (mission, facturation) pour entreprises.",
    discovery_type: "spontaneous",
    sourceUrl: "https://www.malt.fr",
    reasons: ["Marketplace", "Produit high-volume", "Scale-up"],
  },
  {
    name: "Welcome to the Jungle",
    domain: "welcometothejungle.com",
    website: "https://www.welcometothejungle.com",
    sector: "Medias RH",
    size_min: 100,
    size_max: 250,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Média et plateforme recrutement : contenus marque employeur et outil de recrutement pour entreprises.",
    discovery_type: "offer_detected",
    sourceUrl: "https://www.welcometothejungle.com",
    reasons: ["Marque employeur", "Produit recrutement", "Contenu"],
  },
  {
    name: "Hellowork",
    domain: "hellowork.com",
    website: "https://www.hellowork.com",
    sector: "Medias RH",
    size_min: 250,
    size_max: 500,
    headquarters: "Marseille",
    locations: ["Marseille", "Aix-en-Provence", "Paris"],
    remote_ok: false,
    description:
      "Groupe media RH : découverte de métiers, offres d’emploi et conseils carrière, basé à Marseille.",
    discovery_type: "spontaneous",
    sourceUrl: "https://www.hellowork.com",
    reasons: ["RH", "Marseille", "Produit contenu + jobs"],
  },
  {
    name: "Holis",
    domain: "holis.fr",
    website: "https://holis.fr",
    sector: "Fintech",
    size_min: 50,
    size_max: 200,
    headquarters: "Marseille",
    locations: ["Marseille", "Aix-en-Provence", "Remote France"],
    remote_ok: true,
    description:
      "Assureur tech : épargne retraite et assurance-vie digitales pour particuliers, historique fintech locale.",
    discovery_type: "spontaneous",
    sourceUrl: "https://holis.fr",
    reasons: ["Assurance tech", "Marseille", "Produit épargne"],
  },
  {
    name: "Houra",
    domain: "houra-consulting.com",
    website: "https://houra-consulting.com",
    sector: "IT services",
    size_min: 50,
    size_max: 200,
    headquarters: "Toulouse",
    locations: ["Toulouse", "Marseille", "Paris"],
    remote_ok: false,
    description:
      "Cabinet de conseil et ESN : développement, data et cloud pour clients banque/assurance publics.",
    discovery_type: "spontaneous",
    sourceUrl: "https://houra-consulting.com",
    reasons: ["ESN", "Secteur public", "Banque/assurance"],
  },
  {
    name: "Docaposte",
    domain: "docaposte.com",
    website: "https://www.docaposte.com",
    sector: "Services numériques",
    size_min: 1000,
    size_max: 5000,
    headquarters: "Marseille",
    locations: ["Marseille", "Aix-en-Provence", "Paris"],
    remote_ok: false,
    description:
      "Filiale numérique du groupe La Poste : confiance numérique, identity, dématérialisation, data au service des institutions.",
    discovery_type: "spontaneous",
    sourceUrl: "https://www.docaposte.com",
    reasons: ["Digital grand groupe", "Marseille", "Confiance numérique"],
  },
  {
    name: "Slimpay",
    domain: "slimpay.com",
    website: "https://slimpay.com",
    sector: "Paiement",
    size_min: 50,
    size_max: 200,
    headquarters: "Paris",
    locations: ["Paris", "Remote France", "Marseille"],
    remote_ok: true,
    description:
      "Moteur de paiement récurrent (prélèvement SEPA, open banking) pour fintechs et assureurs.",
    discovery_type: "spontaneous",
    sourceUrl: "https://slimpay.com",
    reasons: ["Open banking", "B2B paiement", "API"],
  },
  {
    name: "Treezor",
    domain: "treezor.com",
    website: "https://www.treezor.com",
    sector: "Fintech",
    size_min: 100,
    size_max: 250,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Plateforme Bank-in-a-Box : core banking, cartes et IBAN pour fintechs et applications de paiement.",
    discovery_type: "spontaneous",
    sourceUrl: "https://www.treezor.com",
    reasons: ["Banking-as-a-Service", "API produit", "Fintech infra"],
  },
  {
    name: "MangoPay",
    domain: "mangopay.com",
    website: "https://www.mangopay.com",
    sector: "Fintech",
    size_min: 100,
    size_max: 250,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Infrastructure de paiement dédiée aux marketplace (KYC, escrow, payout).",
    discovery_type: "spontaneous",
    sourceUrl: "https://www.mangopay.com",
    reasons: ["Marketplace payments", "Fintech infra", "B2B API"],
  },
  {
    name: "Lydia — SumUp",
    domain: "sumup.com",
    website: "https://www.sumup.com/fr-fr/",
    sector: "Fintech",
    size_min: 1000,
    size_max: 5000,
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    description:
      "Solutions de paiement pour petits commerçants (terrements, transferts, comptes) — ex-Lydia devenu SumUp France.",
    discovery_type: "spontaneous",
    sourceUrl: "https://www.sumup.com",
    reasons: ["Paiement mobiles", "PME", "Global scale"],
  },
]

function matchesSectors(candidate: MockCompanySeed, sectors: string[]): boolean {
  if (sectors.length === 0) return true
  const hay = `${candidate.sector} ${candidate.reasons.join(" ")}`.toLowerCase()
  return sectors.some((s) => hay.includes(s.toLowerCase()))
}

function matchesLocations(
  candidate: MockCompanySeed,
  locations: string[],
  remote: boolean
): boolean {
  if (locations.length === 0) return remote ? candidate.remote_ok : true
  const hay = [candidate.headquarters ?? "", ...candidate.locations]
    .join(" ")
    .toLowerCase()
  return locations.some((loc) => {
    const needle = loc.toLowerCase()
    if (needle.includes("remote")) return candidate.remote_ok
    return hay.includes(needle)
  })
}

function overlapsSize(
  candidate: MockCompanySeed,
  sizeMin: number | null,
  sizeMax: number | null
): boolean {
  if (sizeMin == null && sizeMax == null) return true
  const cMin = candidate.size_min ?? 0
  const cMax = candidate.size_max ?? Infinity
  if (sizeMin != null && cMax < sizeMin) return false
  if (sizeMax != null && cMin > sizeMax) return false
  return true
}

export function listMockCompanyCandidates(
  criteria: CompanySearchCriteria
): CompanyCandidate[] {
  return MOCK_COMPANIES.filter((candidate) => {
    if (!matchesSectors(candidate, criteria.sectors)) return false
    if (!matchesLocations(candidate, criteria.locations, criteria.remote)) {
      return false
    }
    if (!overlapsSize(candidate, criteria.size_min, criteria.size_max)) {
      return false
    }
    return true
  }).map(({ description, ...candidate }) => ({
    ...candidate,
    description: description ?? null,
  }))
}