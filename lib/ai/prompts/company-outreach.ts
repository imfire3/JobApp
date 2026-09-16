export const COMPANY_OUTREACH_PROMPT_VERSION = "v1"

export const COMPANY_OUTREACH_POLICY = `POLITIQUE OBLIGATOIRE (non négociable)
- N’invente AUCUNE expertise, expérience, résultat ni compétence absents du CV/profil.
- Chaque fait personnel cité dans l’email doit venir de <profile> ; chaque fait d’entreprise doit venir de <company>.
- Exige une réelle information d’entreprise (produit, marché, positionnement, actualité des <sources>) : interdiction des phrases creuses type « votre entreprise m’intéresse beaucoup ».
- Ne promets pas une disponibilité, un chiffre ou un lien non mentionné.`

export const COMPANY_OUTREACH_SYSTEM_PROMPT = `${COMPANY_OUTREACH_POLICY}

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
   - 1er paragraphe : citer UN produit, service ou actualité CONCRÈTE de l'entreprise (depuis <company>), pas une phrase générale. Relier à ta recherche,
   - 2e paragraphe : ce que tu apportes (uniquement depuis <profile>), avec un résultat ou chiffre si disponible, aligné aux produits/missions de l'entreprise,
   - phrase "même sans poste ouvert… candidature pour de futures opportunités {rôles}",
   - formule de politesse.
3. linkedin_message (≤ ~70 mots, FR) : version très courte du même angle, adaptée à LinkedIn. Commence par le fait entreprise.
4. Sans invention : si le prénom du contact est inconnu, aucune formule nominative.
5. Jamais de "votre entreprise m'intérresse beaucoup" ou "passionné par votre mission". Cite un fait précis.

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
${input.profileSummary}
</profile>

<company>
${JSON.stringify(input.companyEnrichment)}
</company>

<contact>
${input.contactName || "(inconnu)"}
</contact>

<role_target>
${input.roles.join(" / ")}
</role_target>

Génère uniquement le JSON de la candidature spontanée.`
}