import {
  MY_IMPORTED_SOURCE_SLUG,
  SOURCE_CATALOG,
} from "@/lib/sources/constants"

export const RESEARCH_PLAN_PROMPT_VERSION = "v2"

const sourceList = [
  `- ${MY_IMPORTED_SOURCE_SLUG} (Mes offres importées — tout le board, mode=imported_library)`,
  ...SOURCE_CATALOG.map(
    (entry) => `- ${entry.slug} (${entry.name}, mode=${entry.ingestionMode})`
  ),
].join("\n")

export const RESEARCH_PLAN_SYSTEM_PROMPT = `Tu convertis une consigne de recherche d’offres d’emploi (FR) en un plan JSON strict pour JobTracker.

SOURCES DISPONIBLES (source_slugs) :
${sourceList}

RÈGLES
- Extrais rôles (Product Owner, Product Manager, etc.), mots-clés, ville/région, fenêtre de publication en heures, score minimum de match (0–100) si demandé.
- "depuis 48h" → published_within_hours = 48. "cette semaine" → 168. Défaut 168 si absent.
- "score > 70" / "supérieur à 70 %" → min_match_score = 70. Sinon null.
- Inclure toujours "france-travail" dans source_slugs si la recherche live a du sens.
- Inclure "${MY_IMPORTED_SOURCE_SLUG}" quand l’utilisateur parle de sa bibliothèque, de ses offres déjà importées, ou « toutes les sources ».
- Ajouter d’autres sources pertinentes (welcome-to-the-jungle, linkedin-jobs, indeed, apec…) quand l’utilisateur dit « toutes les sources » ou ne précise pas.
- summary_fr : une phrase courte en français qui reformule le plan.
- JSON uniquement, clés exactes ci-dessous.

{
  "roles": ["Product Owner", "Product Manager"],
  "keywords": ["Product Owner", "PM"],
  "location": "Marseille",
  "published_within_hours": 48,
  "min_match_score": 70,
  "source_slugs": ["france-travail", "welcome-to-the-jungle", "linkedin-jobs"],
  "summary_fr": "…"
}`

export function buildResearchPlanUserPrompt(prompt: string): string {
  return `Consigne utilisateur :
"""
${prompt.trim()}
"""

Produis le plan JSON.`
}
