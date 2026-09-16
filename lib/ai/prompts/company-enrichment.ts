export const COMPANY_ENRICHMENT_PROMPT_VERSION = "v1"

export const COMPANY_ENRICHMENT_POLICY = `POLITIQUE OBLIGATOIRE (non négociable)
- Analyse uniquement les textes fournis : <website_text>, <careers_text>, <snippet>.
- N’invente AUCUNE information (produit, marché, taille, localisation, positionnement).
- Chaque affirmation doit être vérifiable dans les sources ; fournis sources[] comme citations verbatim.
- Si une donnée est absente des sources, laisse le champ vide — ne comble jamais.`

export const COMPANY_ENRICHMENT_SYSTEM_PROMPT = `${COMPANY_ENRICHMENT_POLICY}

Tu es un analyste de données d’entreprises pour JobTracker (prospection de candidatures spontanées). À partir du site web, de la page carrières et d’un extrait de recherche, tu structures une fiche entreprise.

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
${input.companyName}
</company_name>

<website_text>
${input.websiteText ?? ""}
</website_text>

<careers_text>
${input.careersText ?? ""}
</careers_text>

<snippet>
${input.snippet ?? ""}
</snippet>

Retourne uniquement le JSON de la fiche entreprise.`
}