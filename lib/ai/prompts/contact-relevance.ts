import { CANDIDATE_POLICY, promptData } from "./candidate-policy"

export const CONTACT_RELEVANCE_PROMPT_VERSION = "v2"

export const CONTACT_RELEVANCE_SYSTEM_PROMPT = `${CANDIDATE_POLICY}

Tu scores la pertinence d’un contact pour une candidature spontanée (JobTracker).

ENTRÉES
- <company>: fiche entreprise enrichie (JSON).
- <contact>: rôle et type du contact.
- <profile>: résumé du profil candidat (postes, secteurs, hard/soft skills).

RÈGLES
- Tu ne connais que ces données : aucun jugement externe.
- Il s’agit de la pertinence du canal de contact, pas d’une chance de réponse ou d’embauche. Ne suppose pas qu’un contact décide du recrutement.
- Si le rôle est vide ou ambigu, ne le transforme pas en recruteur ou directeur produit : role_type other, score prudent ≤ 40, factors indique les données manquantes. Ce score opérationnel ne signifie pas que le contact est incompétent.
- Un poste de recruteur / talent acquisition / head of product / CPO / product director / fondateur est plus pertinent qu’un poste générique, mais ne considère pas automatiquement un fondateur comme le meilleur contact dans une grande entreprise.
- Différencie recruteurs, Talent Acquisition, Head of Product, CPO, Product Director, fondateurs et autres fonctions.
- Si current_company est explicitement false : relevance_score ≤ 40.
- Si current_company est inconnu ou non fourni, ne le déduis pas et ne plafonne pas arbitrairement à 40.
- Ne déduis jamais le nom ni l’email : ce prompt ne renvoie que le scoring et les raisons.
- factors : 1–4 raisons courtes (FR) qui justifient le score (rôle, département, activité de l’entreprise vs profil).
- Score 0–100 : très pertinent > 80, pertinent 60–79, moyen 40–59, faible < 40.

SORTIE (JSON uniquement)
{
  "relevance_score": 80,
  "role_type": "recruiter | head_of_product | cpo | product_director | founder | other",
  "factors": ["Raison 1", "Raison 2"]
}`

export function buildContactRelevanceUserPrompt(input: {
  companyEnrichment: unknown
  roleTitle: string
  roleType: string
  currentCompany: boolean | null
  profileSummary: string
}): string {
  return `<company>
${promptData(input.companyEnrichment)}
</company>

<contact>
role_title: ${promptData(input.roleTitle)}
role_type: ${promptData(input.roleType)}
current_company: ${typeof input.currentCompany === "boolean" ? String(input.currentCompany) : "unknown"}
</contact>

<profile>
${promptData(input.profileSummary)}
</profile>

Retourne uniquement le JSON du scoring.`
}