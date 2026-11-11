import { CANDIDATE_POLICY, promptData } from "./candidate-policy"

export const COVER_LETTER_PROMPT_VERSION = "v5"

/**
 * Cover letter pack: angle briefing + letter + coach notes.
 * Facts only from CV + job posting; match_context is advisory only.
 */
export const COVER_LETTER_SYSTEM_PROMPT = `${CANDIDATE_POLICY}

Tu es un conseiller en candidatures adapté au métier et à la langue de l’offre, notamment Product / Product Builder / Growth / UX. Tu aides le candidat à se positionner avec lucidité, puis tu rédiges une lettre à la première personne dans sa voix.

MISSION
Produire un pack candidature JSON pour une offre précise :
1. angle_briefing — 2 à 5 phrases : fit + angle unique choisi (pas une liste de métiers)
2. subject — objet e-mail court
3. letter — corps de lettre prêt à coller
4. coach_notes — 2 à 4 notes courtes

SOURCES AUTORISÉES
Le message utilisateur fournit <cv_text>, <job_posting>, éventuellement <writing_preferences> et <match_context>.
- Faits d'expérience / compétences / métriques : uniquement <cv_text>.
- Besoins du poste / entreprise : uniquement <job_posting>.
- <ai_summary_advisory> et <match_context> = indices — jamais une source de faits. Ne copie pas aveuglément et ne l'utilise pas pour combler des lacunes.
- <writing_preferences> = ton / longueur seulement.

MÉTHODE
1. Identifie le cœur du poste.
2. Choisis un seul angle cohérent avec le CV et l'offre.
3. Sélectionne jusqu’à 2-3 preuves CV utiles pour cet angle ; moins si le CV en documente moins. Aucun quota ne justifie une invention.
4. Ne jamais inventer une exigence absente du CV. N'invente jamais une compétence pour combler un écart.
5. Si une exigence importante est non documentée, distingue l’inconnu d’une incompatibilité : signale-le dans coach_notes et rédige depuis les acquis réels. N’affirme ni absence certaine de compétence ni maîtrise non établie. Une transparence courte est utile dans la lettre seulement si l’écart explicite est déterminant ; pas d’auto-élimination systématique.

LETTRE — CONTENU
- Ouverture liée à une mission / produit / enjeu de l'offre.
- Nom entreprise + intitulé si fournis.
- Jusqu’à 2-3 liens concrets CV ↔ besoins, avec chiffres et contexte uniquement s’ils sont documentés. Ne force pas un résultat mesuré.
- N’insère aucun score interne dans la lettre. N’annonce pas de CV joint, de disponibilité, de mobilité ou d’envoi déjà effectué sans fait explicite.
- Ton direct, non scolaire.
- Pas de listes à puces dans letter. Pas de markdown.
- Pas de signature inventée.
- letter commence par la salutation (Bonjour...), sans répéter l'objet.

EXACTITUDE
- N'invente aucune expérience, stack, domaine absent du CV.
- N'invente jamais une compétence pour combler un écart. Utilise uniquement des faits démontrés dans le CV.
- Ne transforme pas "contribuer" en "diriger", ni un résultat collectif en individuel.
- Reprends les chiffres avec leur contexte.
- Pas de disponibilité / salaire / destinataire inventés.
- Pas de placeholders [crochets].

STYLE
- Langue principale de l'offre (FR/EN).
- ~220-380 mots pour letter, 4-6 paragraphes.
- Évite clichés : passionné, dynamique, candidat idéal, relever de nouveaux défis.
- Formulations FR neutres quant au genre.

COACH_NOTES
2-4 puces courtes, tutoiement OK.

SORTIE
JSON valide uniquement, sans markdown :
{
  "angle_briefing": "",
  "subject": "",
  "letter": "",
  "coach_notes": ["", ""]
}

Exception : si CV ou offre inexploitable → letter courte expliquant le document manquant, angle_briefing et coach_notes peuvent être vides, subject "".`

export interface CoverLetterMatchContext {
  coverLetterAngle?: string | null
  scoreExplanation?: string | null
  matchGaps?: string[] | null
  weakCriteria?: string[] | null
}

export interface CoverLetterPromptInput {
  cvText: string
  title: string
  company: string
  city: string | null
  contractType: string | null
  remoteMode: string | null
  salaryMin: number | null
  salaryMax: number | null
  experienceMinYears: number | null
  summary: string | null
  profile: string | null
  skills: string[]
  description: string | null
  aiSummary: string | null
  url: string
  writingPreferences?: string | null
  matchContext?: CoverLetterMatchContext | null
}

function formatExperienceRequirement(years: number | null): string {
  if (years === null || years === undefined) return "Not specified"
  return `At least ${years} year${years > 1 ? "s" : ""}`
}

function formatSalaryRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Not specified"
  if (min !== null && max !== null) {
    return `${Math.round(min / 1000)}k–${Math.round(max / 1000)}k EUR/year`
  }
  if (min !== null) return `From ${Math.round(min / 1000)}k EUR/year`
  return `Up to ${Math.round(max! / 1000)}k EUR/year`
}

function formatLocation(city: string | null, remoteMode: string | null): string {
  const parts = [city, remoteMode ? `(${remoteMode})` : null].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "Not specified"
}

function buildMatchContextBlock(
  matchContext?: CoverLetterMatchContext | null
): string {
  if (!matchContext) {
    return `<match_context>
non renseigné — choisis l’angle uniquement depuis CV + offre
</match_context>`
  }

  const gaps = (matchContext.matchGaps ?? []).filter(Boolean).slice(0, 5)
  const weak = (matchContext.weakCriteria ?? []).filter(Boolean).slice(0, 5)
  const explanation = (matchContext.scoreExplanation ?? "").trim().slice(0, 900)
  const angle = (matchContext.coverLetterAngle ?? "").trim().slice(0, 400)

  return `<match_context>
Advisory only (not evidence). Prefer CV + job posting when they conflict.
Suggested angle from prior match analysis: ${promptData(angle || "n/a")}
Score explanation excerpt: ${promptData(explanation || "n/a")}
Known gaps: ${promptData(gaps.length ? gaps.join(" · ") : "n/a")}
Weak / low-evidence criteria: ${promptData(weak.length ? weak.join(" · ") : "n/a")}
</match_context>`
}

export function buildCoverLetterUserPrompt(input: CoverLetterPromptInput): string {
  const missionBlock = [
    input.summary ? `Mission summary:\n${input.summary}` : null,
    input.profile ? `Expected profile:\n${input.profile}` : null,
    input.skills.length > 0 ? `Key skills sought:\n${input.skills.join(", ")}` : null,
    input.description ? `Full job description:\n${input.description}` : null,

  ]
    .filter(Boolean)
    .join("\n\n")

  const writingPreferences =
    input.writingPreferences?.trim() || "non renseigné"

  return `Rédige le pack candidature JSON (angle_briefing, subject, letter, coach_notes) pour cette offre.

${buildMatchContextBlock(input.matchContext)}

<ai_summary_advisory>
${promptData(input.aiSummary ?? null)}
</ai_summary_advisory>

<cv_text>
${promptData(input.cvText)}
</cv_text>

<job_posting>
Title: ${promptData(input.title)}
Company: ${promptData(input.company)}
Location: ${promptData(formatLocation(input.city, input.remoteMode))}
Contract: ${promptData(input.contractType ?? "Not specified")}
Remote mode: ${promptData(input.remoteMode ?? "Not specified")}
Salary range: ${promptData(formatSalaryRange(input.salaryMin, input.salaryMax))}
Experience requirement: ${promptData(formatExperienceRequirement(input.experienceMinYears))}
Job URL: ${promptData(input.url)}

${promptData(missionBlock || "Not provided")}
</job_posting>

<writing_preferences>
${promptData(writingPreferences)}
</writing_preferences>`
}
