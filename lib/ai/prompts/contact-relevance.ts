export const CONTACT_RELEVANCE_PROMPT_VERSION = "v1"

export const CONTACT_RELEVANCE_SYSTEM_PROMPT = `Tu scores la pertinence d’un contact pour une candidature spontanée (JobTracker).

ENTRÉES
- <company>: fiche entreprise enrichie (JSON).
- <contact>: rôle et type du contact.
- <profile>: résumé du profil candidat (postes, secteurs, hard/soft skills).

RÈGLES
- Tu ne connais que ces données : aucun jugement externe.
- Un poste de recruteur / talent acquisition / head of product / CPO / product director / fondateur est plus pertinent qu’un poste générique.
- Le contact doit être « dans » l’entreprise (current_company true) : sinon relevance_score ≤ 40.
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
  currentCompany: boolean
  profileSummary: string
}): string {
  return `<company>
${JSON.stringify(input.companyEnrichment)}
</company>

<contact>
role_title: ${input.roleTitle}
role_type: ${input.roleType}
current_company: ${input.currentCompany}
</contact>

<profile>
${input.profileSummary}
</profile>

Retourne uniquement le JSON du scoring.`
}