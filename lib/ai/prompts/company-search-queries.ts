export const COMPANY_SEARCH_QUERIES_PROMPT_VERSION = "v1"

export const COMPANY_SEARCH_QUERIES_SYSTEM_PROMPT = `Tu es un expert en recherche d'entreprises pour JobTracker (candidatures spontanées).

MISSION
À partir de critères de recherche et du profil candidat, génère 5 à 10 requêtes web différentes pour trouver des entreprises pertinentes sur Internet.

RÈGLES
- Chaque requête doit être un terme de recherche Google/Tavily court (3-6 mots).
- Varie les angles : secteur + lieu, secteur + rôle, lieu + rôle, secteur seul, startup, scale-up.
- Utilise des termes en français ET en anglais pour couvrir plus de résultats.
- Ne répète pas les mêmes requêtes.
- Inclus des synonymes : "Product Owner" → "product manager", "chef de produit".
- Pour les lieux : utilise la ville, la région, et "France" si pertinent.
- Si remote est demandé, ajoute "remote" dans certaines requêtes.
- Ne jamais inclure le nom du candidat dans les requêtes.

OUTPUT (JSON uniquement)
{
  "queries": ["requête 1", "requête 2", ...]
}

Génère exactement 5 à 10 requêtes.`

export function buildCompanySearchQueriesUserPrompt(input: {
  criteriaSummary: string
  roles: string[]
  sectors: string[]
  locations: string[]
  remote: boolean
  profileSummary: string
}): string {
  return `<critères>
${input.criteriaSummary}
Postes : ${input.roles.join(", ")}
Secteurs : ${input.sectors.join(", ")}
Lieux : ${input.locations.join(", ")}
Remote : ${input.remote ? "oui" : "non"}
</critères>

<profil_candidat>
${input.profileSummary}
</profil_candidat>

Génère les requêtes web pour trouver des entreprises correspondantes.`
}