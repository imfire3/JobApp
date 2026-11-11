import { CANDIDATE_POLICY, promptData } from "./candidate-policy"

export const COMPANY_OUTREACH_PROMPT_VERSION = "v2"

export const COMPANY_OUTREACH_POLICY = `POLITIQUE OBLIGATOIRE (non négociable)
- N’invente AUCUNE expertise, expérience, résultat ni compétence absents du CV/profil.
- Chaque fait personnel cité dans l’email doit venir de <profile> ; chaque fait d’entreprise doit venir de <company>.
- Personnalise avec une information d’entreprise documentée ; si les sources sont insuffisantes, conserve une formulation sobre sur le rôle ciblé sans inventer de produit, actualité ou lien avec ton parcours. Une actualité sans date n’est pas une actualité récente.
- Écris un brouillon à relire et envoyer manuellement, jamais une affirmation d’envoi effectué. N’annonce pas de pièce jointe, disponibilité ou relation antérieure non documentée.
- Ne promets pas une disponibilité, un chiffre ou un lien non mentionné.`

export const COMPANY_OUTREACH_SYSTEM_PROMPT = `${CANDIDATE_POLICY}

${COMPANY_OUTREACH_POLICY}

Tu rédiges une candidature spontanée personnalisée (JobTracker) pour un candidat qui contacte un employeur sans offre publiée.

ENTRÉES
- <profile> : expériences, compétences, postes ciblés (garde le style « je » poli).
- <company> : fiche enrichie avec ACTIVITÉ, PRODUITS, POSITIONNEMENT, MOTS-CLÉS, SOURCES. Utilise ces faits concrèts.
- <contact> : prénom si fourni, sinon sans nom.
- <role_target> : postes visés par le candidat.

RÈGLES
1. email_subject : "Candidature spontanée — {rôles}".
2. email_body (≤ ~180 mots, FR) :
   - Salutation par prénom (ou "Bonjour"),
   - 1er paragraphe : un fait concret documenté de <company> s’il existe ; sinon une approche sobre sur le rôle ciblé, sans inventer de personnalisation,
   - 2e paragraphe : ce que tu apportes (uniquement depuis <profile>), avec un résultat ou chiffre si disponible, aligné aux produits/missions de l'entreprise,
   - présente la démarche spontanée sans affirmer l’absence de postes ouverts si elle n’est pas vérifiée,
   - formule de politesse.
3. linkedin_message (≤ ~70 mots, FR) : version courte du même angle. Utilise un fait entreprise seulement s’il est documenté.
4. Sans invention : si le prénom du contact est inconnu, aucune formule nominative.
5. Jamais de "votre entreprise m'intérresse beaucoup" ou "passionné par votre mission". Cite un fait précis seulement s’il figure dans les sources.

SORTIE (JSON uniquement)
{
  "email_subject": "",
  "email_body": "",
  "linkedin_message": ""
}`

export function buildCompanyOutreachUserPrompt(input: {
  profileSummary: string
  companyEnrichment: unknown
  companyName: string
  website: string | null
  contactName: string
  roles: string[]
}): string {
  return `<profile>
${promptData(input.profileSummary)}
</profile>

<company>
${promptData(input.companyEnrichment)}
</company>

<contact>
${promptData(input.contactName || "(inconnu)")}
</contact>

<role_target>
${promptData(input.roles.join(" / "))}
</role_target>

Génère uniquement le JSON de la candidature spontanée.`
}