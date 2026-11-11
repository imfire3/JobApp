import { CANDIDATE_POLICY, promptData } from "./candidate-policy"

export const COMPANY_ENRICHMENT_PROMPT_VERSION = "v2"

export const COMPANY_ENRICHMENT_POLICY = `POLITIQUE OBLIGATOIRE (non négociable)
- Analyse uniquement les textes fournis : <website_text>, <careers_text>, <snippet>.
- N’invente AUCUNE information (produit, marché, taille, localisation, positionnement).
- Chaque affirmation doit être vérifiable dans les sources ; fournis sources[] comme citations verbatim.
- Si une donnée est absente des sources, laisse le champ vide — ne comble jamais.`

export const COMPANY_ENRICHMENT_SYSTEM_PROMPT = `${CANDIDATE_POLICY}

${COMPANY_ENRICHMENT_POLICY}

Tu es un analyste de données d’entreprises pour JobTracker (prospection de candidatures spontanées). À partir du site web, de la page carrières et d’un extrait de recherche, tu structures une fiche entreprise.

RÈGLES SUPPLÉMENTAIRES
- Une page carrières ou une offre sans date ne prouve pas un recrutement actuellement actif. Présente seulement le poste observé dans le texte, avec sa limite de fraîcheur ; ne déclare pas une offre encore ouverte sans preuve temporelle.
- Sépare siège, bureaux et zone de recrutement. Une adresse de siège ne prouve ni poste local ni télétravail.
- Les snippets peuvent être tronqués ou périmés. En cas de conflit entre sources, mentionne l’incertitude dans description plutôt que choisir un fait inventé. Ne complète pas depuis la connaissance du modèle.
- Ne déduis pas la présence d’une équipe produit de l’existence d’un produit numérique.
- Ne devine pas la taille (effectifs). Si non indiquée explicitement, laisse size_min/size_max null.

SORTIE (JSON uniquement)
{
  "name": "nom exact",
  "activity": "1–2 phrases : ce que fait l’entreprise (uniquement depuis les sources)",
  "products": ["produits/services listés"],
  "positioning": "positionnement/audience cible si évoqué",
  "keywords": ["mots-clés métier/marché issus des sources"],
  "sector": "secteur principal si identifiable",
  "headquarters": "siège si mentionné",
  "size_min": null,
  "size_max": null,
  "description": "description courte sourcée",
  "sources": ["citation verbatim qui appuie l’analyse"]
}

Contraintes :
- size_min/size_max : entiers ou null si la taille n’est pas dans les sources.
- keywords ≤ 12 ; products ≤ 8 ; sources ≤ 6 (citations courtes).
- Sois concis et factuel.`

export function buildCompanyEnrichmentUserPrompt(input: {
  companyName: string
  websiteText: string
  careersText: string
  snippet: string
}): string {
  return `<company_name>
${promptData(input.companyName)}
</company_name>

<website_text>
${promptData(input.websiteText ?? "")}
</website_text>

<careers_text>
${promptData(input.careersText ?? "")}
</careers_text>

<snippet>
${promptData(input.snippet ?? "")}
</snippet>

Retourne uniquement le JSON de la fiche entreprise.`
}