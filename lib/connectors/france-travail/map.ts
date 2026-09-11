import type { ImportedJob } from "@/types"

/** Minimal shape of an FT offre from Offres d'emploi v2 search. */
export type FranceTravailOffre = {
  id?: string
  intitule?: string
  description?: string
  dateCreation?: string
  dateActualisation?: string
  typeContrat?: string
  typeContratLibelle?: string
  natureContrat?: string
  dureeTravailLibelle?: string
  salaire?: {
    libelle?: string
    commentaire?: string
  }
  lieuTravail?: {
    libelle?: string
    codePostal?: string
    commune?: string
    latitude?: number
    longitude?: number
  }
  entreprise?: {
    nom?: string
    description?: string
  }
  origineOffre?: {
    urlOrigine?: string
  }
  qualificationLibelle?: string
  experienceLibelle?: string
  secteurActiviteLibelle?: string
  appellationlibelle?: string
}

export function mapFranceTravailOffreToImportedJob(
  offre: FranceTravailOffre
): ImportedJob | null {
  const title = (offre.intitule || offre.appellationlibelle || "").trim()
  const company = (offre.entreprise?.nom || "").trim() || "Entreprise non précisée"
  const id = (offre.id || "").trim()
  const originUrl = offre.origineOffre?.urlOrigine?.trim()
  const url =
    originUrl ||
    (id
      ? `https://candidat.francetravail.fr/offres/recherche/detail/${id}`
      : "")

  if (!title || !url) return null

  const location = (offre.lieuTravail?.libelle || "").trim() || null
  const remoteHint = `${offre.lieuTravail?.libelle || ""} ${offre.description || ""}`
  const remote = /télétravail|teletravail|remote|full.?remote/i.test(remoteHint)
  const salary =
    offre.salaire?.libelle?.trim() ||
    offre.salaire?.commentaire?.trim() ||
    null
  const contract =
    offre.typeContratLibelle?.trim() ||
    offre.typeContrat?.trim() ||
    offre.natureContrat?.trim() ||
    null
  const postedRaw = offre.dateActualisation || offre.dateCreation
  const postedAt = postedRaw
    ? new Date(postedRaw).toISOString()
    : new Date().toISOString()

  return {
    title,
    company,
    source: "france_travail",
    location,
    remote,
    salary,
    contract_type: contract,
    posted_at: postedAt,
    url,
    description: (offre.description || "").trim() || null,
  }
}

export function mapFranceTravailOffres(
  offres: FranceTravailOffre[]
): ImportedJob[] {
  const jobs: ImportedJob[] = []
  const seen = new Set<string>()
  for (const offre of offres) {
    const job = mapFranceTravailOffreToImportedJob(offre)
    if (!job) continue
    if (seen.has(job.url)) continue
    seen.add(job.url)
    jobs.push(job)
  }
  return jobs
}
