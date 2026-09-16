import OpenAI from "openai"
import {
  COMPANY_SEARCH_INTENT_PROMPT_VERSION,
  COMPANY_SEARCH_INTENT_SYSTEM_PROMPT,
  buildCompanySearchIntentUserPrompt,
} from "@/lib/ai/prompts/company-search-intent"
import {
  parseCompanySearchIntent,
} from "@/lib/ai/schemas/company-search-intent"
import {
  COMPANY_ENRICHMENT_PROMPT_VERSION,
  buildCompanyEnrichmentUserPrompt,
  COMPANY_ENRICHMENT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/company-enrichment"
import {
  parseCompanyEnrichment,
  type CompanyEnrichment,
} from "@/lib/ai/schemas/company-enrichment"
import {
  CONTACT_RELEVANCE_PROMPT_VERSION,
  buildContactRelevanceUserPrompt,
  CONTACT_RELEVANCE_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/contact-relevance"
import {
  parseContactRelevance,
  type ContactRelevance,
} from "@/lib/ai/schemas/contact-relevance"
import {
  COMPANY_OUTREACH_PROMPT_VERSION,
  buildCompanyOutreachUserPrompt,
  COMPANY_OUTREACH_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/company-outreach"
import {
  parseCompanyOutreach,
  type CompanyOutreach,
} from "@/lib/ai/schemas/company-outreach"
import {
  COMPANY_SEARCH_QUERIES_PROMPT_VERSION,
  COMPANY_SEARCH_QUERIES_SYSTEM_PROMPT,
  buildCompanySearchQueriesUserPrompt,
} from "@/lib/ai/prompts/company-search-queries"
import {
  parseCompanySearchQueries,
} from "@/lib/ai/schemas/company-search-queries"
import {
  COMPANY_MATCH_PROMPT_VERSION,
  COMPANY_MATCH_SYSTEM_PROMPT,
  buildCompanyMatchUserPrompt,
} from "@/lib/ai/prompts/company-match"
import {
  parseCompanyMatch,
  calculateCompanyMatchScore,
  type CompanyMatchResult,
} from "@/lib/ai/schemas/company-match"
import { mapOpenAIError, resolveOpenAIApiKey } from "@/lib/openai/api-key"
import type { CompanySearchCriteria } from "@/types"

function jsonCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { apiKey?: string | null; temperature?: number }
) {
  const client = new OpenAI({ apiKey: resolveOpenAIApiKey(options?.apiKey) })
  return client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: options?.temperature ?? 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })
}

export async function generateCompanySearchIntent(
  prompt: string,
  options?: { apiKey?: string | null }
): Promise<{ criteria: CompanySearchCriteria; promptVersion: string }> {
  let response
  try {
    response = await jsonCompletion(
      COMPANY_SEARCH_INTENT_SYSTEM_PROMPT,
      buildCompanySearchIntentUserPrompt(prompt),
      options
    )
  } catch (error) {
    throw mapOpenAIError(error)
  }
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty company search intent from OpenAI")
  const parsed = parseCompanySearchIntent(JSON.parse(content))
  return {
    criteria: {
      ...parsed,
      priority: parsed.priority || undefined,
      size_min: parsed.size_min,
      size_max: parsed.size_max,
      remote: parsed.remote,
    },
    promptVersion: COMPANY_SEARCH_INTENT_PROMPT_VERSION,
  }
}

export async function enrichCompanyText(
  input: {
    companyName: string
    websiteText: string
    careersText: string
    snippet: string
  },
  options?: { apiKey?: string | null }
): Promise<{ enrichment: CompanyEnrichment; promptVersion: string }> {
  let response
  try {
    response = await jsonCompletion(
      COMPANY_ENRICHMENT_SYSTEM_PROMPT,
      buildCompanyEnrichmentUserPrompt(input),
      options
    )
  } catch (error) {
    throw mapOpenAIError(error)
  }
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty company enrichment from OpenAI")
  return {
    enrichment: parseCompanyEnrichment(JSON.parse(content)),
    promptVersion: COMPANY_ENRICHMENT_PROMPT_VERSION,
  }
}

export async function scoreContactRelevanceWithAI(
  input: {
    companyEnrichment: unknown
    roleTitle: string
    roleType: string
    currentCompany: boolean
    profileSummary: string
  },
  options?: { apiKey?: string | null }
): Promise<{ relevance: ContactRelevance; promptVersion: string }> {
  let response
  try {
    response = await jsonCompletion(
      CONTACT_RELEVANCE_SYSTEM_PROMPT,
      buildContactRelevanceUserPrompt(input),
      options
    )
  } catch (error) {
    throw mapOpenAIError(error)
  }
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty contact relevance from OpenAI")
  return {
    relevance: parseContactRelevance(JSON.parse(content)),
    promptVersion: CONTACT_RELEVANCE_PROMPT_VERSION,
  }
}

export async function generateCompanyOutreach(
  input: {
    profileSummary: string
    companyEnrichment: unknown
    companyName: string
    website: string | null
    contactName: string
    roles: string[]
  },
  options?: { apiKey?: string | null }
): Promise<{ outreach: CompanyOutreach; promptVersion: string }> {
  let response
  try {
    response = await jsonCompletion(
      COMPANY_OUTREACH_SYSTEM_PROMPT,
      buildCompanyOutreachUserPrompt(input),
      options
    )
  } catch (error) {
    throw mapOpenAIError(error)
  }
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty company outreach from OpenAI")
  return {
    outreach: parseCompanyOutreach(JSON.parse(content)),
    promptVersion: COMPANY_OUTREACH_PROMPT_VERSION,
  }
}

export async function generateSearchQueries(
  input: {
    criteria: CompanySearchCriteria
    profileSummary: string
  },
  options?: { apiKey?: string | null }
): Promise<{ queries: string[]; promptVersion: string }> {
  let response
  try {
    response = await jsonCompletion(
      COMPANY_SEARCH_QUERIES_SYSTEM_PROMPT,
      buildCompanySearchQueriesUserPrompt({
        criteriaSummary: input.criteria.summary_fr,
        roles: input.criteria.roles,
        sectors: input.criteria.sectors,
        locations: input.criteria.locations,
        remote: input.criteria.remote,
        profileSummary: input.profileSummary,
      }),
      options
    )
  } catch (error) {
    throw mapOpenAIError(error)
  }
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty search queries from OpenAI")
  return {
    queries: parseCompanySearchQueries(JSON.parse(content)),
    promptVersion: COMPANY_SEARCH_QUERIES_PROMPT_VERSION,
  }
}

export async function scoreCompanyMatch(
  input: {
    profileSummary: string
    criteriaSummary: string
    company: {
      name: string
      website: string | null
      description: string | null
      sector: string | null
      headquarters: string | null
      locations: string[]
      size_min: number | null
      size_max: number | null
      remote_ok: boolean
    }
  },
  options?: { apiKey?: string | null }
): Promise<{
  match: CompanyMatchResult
  finalScore: number
  promptVersion: string
}> {
  let response
  try {
    response = await jsonCompletion(
      COMPANY_MATCH_SYSTEM_PROMPT,
      buildCompanyMatchUserPrompt(input),
      { ...options, temperature: 0.1 }
    )
  } catch (error) {
    throw mapOpenAIError(error)
  }
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty company match from OpenAI")
  const match = parseCompanyMatch(JSON.parse(content))
  return {
    match,
    finalScore: calculateCompanyMatchScore(match),
    promptVersion: COMPANY_MATCH_PROMPT_VERSION,
  }
}