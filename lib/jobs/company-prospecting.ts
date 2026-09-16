import type { SupabaseClient } from "@supabase/supabase-js"
import { searchCompanyCandidates, COMPANY_PROVIDER } from "@/lib/connectors/companies"
import {
  computeCompanyMatchScore,
  computeOpportunityScore,
  type CompanyProfileWeights,
  type CompanyScoreInput,
} from "@/lib/jobs/company-score"
import {
  generateCompanyOutreach,
  generateSearchQueries,
  enrichCompanyText,
} from "@/lib/ai/company-ai"
import { fetchCompanyWebsiteText, fetchCompanyCareersText } from "@/lib/connectors/companies/web-fetch"
import { tavilyExtract, type ExtractResult } from "@/lib/connectors/companies/tavily"
import type {
  Company,
  CompanyCandidate,
  CompanyContact,
  CompanyRoleType,
  CompanySearch,
  CompanySearchCriteria,
  OutreachMessage,
} from "@/types"

export const COMPANIES_PER_SEARCH = 20

interface ContactTemplate {
  roleTitle: string
  roleType: CompanyRoleType
  base: number
  reasons: string[]
}

const CONTACT_TEMPLATES: ContactTemplate[] = [
  {
    roleTitle: "Recruteur / Talent Acquisition",
    roleType: "recruiter",
    base: 92,
    reasons: ["Rôle recrutement : cible directe d’une candidature spontanée"],
  },
  {
    roleTitle: "Head of Product",
    roleType: "head_of_product",
    base: 86,
    reasons: ["Pilote la vision produit : bon relais sur une candidature produit"],
  },
  {
    roleTitle: "Fondateur·rice",
    roleType: "founder",
    base: 88,
    reasons: ["Décideur·se pour une start-up / PME"],
  },
  {
    roleTitle: "Directeur·rice Produit",
    roleType: "product_director",
    base: 82,
    reasons: ["Décide la structuration de l’équipe produit"],
  },
  {
    roleTitle: "Chief Product Officer",
    roleType: "cpo",
    base: 80,
    reasons: ["Décideur produit à un niveau plus large"],
  },
]

export function scoreContactRelevanceLocal(
  roleTitle: string,
  roleType: CompanyRoleType,
  template?: ContactTemplate
): { score: number; reasons: string[] } {
  if (template) {
    return { score: template.base, reasons: template.reasons }
  }
  const byType: Record<CompanyRoleType, number> = {
    recruiter: 90,
    head_of_product: 84,
    cpo: 78,
    product_director: 80,
    founder: 86,
    other: 45,
  }
  return {
    score: byType[roleType] ?? 45,
    reasons: [`Rôle identifié : ${roleTitle.toLowerCase()}`],
  }
}

export function buildContactsForCompany(pageContent?: string): CompanyContact[] {
  const contacts: CompanyContact[] = []
  const contentLower = (pageContent ?? "").toLowerCase()

  const hasRecruitmentPage = /recrut|career|jobs|hir(e|ing)|join\s*us|nous\s*rejoindre/i.test(contentLower)
  const hasTeamPage = /équipe|team|leadership|founder|fondateur|directeur/i.test(contentLower)

  const linkedinMatch = pageContent?.match(/linkedin\.com\/in\/([a-z0-9-]+)/i)
  const emailMatch = pageContent?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)

  for (const template of CONTACT_TEMPLATES.slice(0, 4)) {
    const { score, reasons } = scoreContactRelevanceLocal(
      template.roleTitle,
      template.roleType,
      template
    )

    let notes: string | null = null
    if (template.roleType === "recruiter" && hasRecruitmentPage) {
      notes = "Page recrutement détectée sur le site"
    } else if (template.roleType === "head_of_product" && hasTeamPage) {
      notes = "Section équipe/leadership trouvée"
    } else if (template.roleType === "founder" && hasTeamPage) {
      notes = "Informations direction disponibles"
    }

    contacts.push({
      id: "",
      user_id: "",
      company_id: "",
      name: "",
      role_title: template.roleTitle,
      role_type: template.roleType,
      linkedin_url: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : null,
      email: emailMatch ? emailMatch[1] : null,
      email_confidence: emailMatch ? 40 : null,
      relevance_score: score,
      active: true,
      current_company: true,
      source: pageContent ? "website_extraction" : "mock",
      notes,
      relevance_factors: reasons,
      created_at: "",
      updated_at: "",
    })
  }

  return contacts
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export interface ProfileQuery {
  skills?: string[]
  keywords?: string[]
  target_roles?: string[]
  target_locations?: string[]
  preferred_industries?: string[]
  years_experience?: number | null
  remote_preference?: string | null
}

export function buildProfileWeights(
  profile: ProfileQuery | null
): CompanyProfileWeights | null {
  if (!profile) return null
  return {
    skills: profile.skills ?? [],
    keywords: profile.keywords ?? [],
    targetRoles: profile.target_roles ?? [],
    targetLocations: profile.target_locations ?? [],
    preferredIndustries: profile.preferred_industries ?? [],
    remote: (profile.remote_preference ?? "").toLowerCase().includes("remote"),
    yearsExperience: profile.years_experience ?? null,
  }
}

async function loadProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileQuery | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "skills, keywords, target_roles, target_locations, preferred_industries, years_experience, remote_preference"
    )
    .eq("id", userId)
    .maybeSingle()
  if (error) return null
  return (data as ProfileQuery | null) ?? null
}

function candidateToScoreInput(candidate: CompanyCandidate): CompanyScoreInput {
  return {
    name: candidate.name,
    sector: candidate.sector,
    sectors: candidate.sector ? [candidate.sector] : [],
    keywords: candidate.reasons,
    headquarters: candidate.headquarters,
    locations: candidate.locations ?? [],
    remote_ok: candidate.remote_ok,
    size_min: candidate.size_min,
    size_max: candidate.size_max,
  }
}

function buildProfileSummary(profile: ProfileQuery | null, cvText?: string): string {
  const roles = profile?.target_roles ?? []
  const skills = profile?.skills ?? []
  const keywords = profile?.keywords ?? []
  const industries = profile?.preferred_industries ?? []
  const locations = profile?.target_locations ?? []

  return [
    roles.length > 0 ? `Postes visés : ${roles.join(", ")}` : "",
    skills.length > 0 ? `Compétences : ${skills.join(", ")}` : "",
    keywords.length > 0 ? `Mots-clés : ${keywords.join(", ")}` : "",
    industries.length > 0 ? `Secteurs : ${industries.join(", ")}` : "",
    locations.length > 0 ? `Localisations : ${locations.join(", ")}` : "",
    `Expérience : ${profile?.years_experience ?? "non précisée"} ans`,
    typeof cvText === "string" ? cvText.slice(0, 1500) : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function mockEnrichment(candidate: CompanyCandidate, reasons: string[]) {
  const sourceUrl = candidate.sourceUrl ?? candidate.website
  const keywords = [
    candidate.sector ?? "",
    ...reasons,
    candidate.remote_ok ? "Remote" : "",
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
  return {
    activity: candidate.description ?? "",
    products: [],
    positioning: "",
    keywords,
    sources: sourceUrl ? [sourceUrl] : [],
    extracted_at: new Date().toISOString(),
  }
}

export async function runCompanySearch(input: {
  supabase: SupabaseClient
  userId: string
  searchId: string
  criteria: CompanySearchCriteria
  onCompany?: (company: Company, index: number, total: number) => void
  onStep?: (step: string) => void
}): Promise<{ companies: Company[]; search: CompanySearch; provider: string }> {
  const { supabase, userId, searchId, criteria, onCompany, onStep } = input

  onStep?.("running")
  await supabase
    .from("company_searches")
    .update({ status: "running" })
    .eq("id", searchId)
    .eq("user_id", userId)

  onStep?.("profile")
  const profile = await loadProfile(supabase, userId)
  const weights = buildProfileWeights(profile)

  onStep?.("criteria")
  const profileSummary = buildProfileSummary(profile)

  let candidates: CompanyCandidate[]
  let provider: string

  onStep?.("search")
  if (COMPANY_PROVIDER === "tavily") {
    let queries: string[] = []
    try {
      const queryResult = await generateSearchQueries({
        criteria,
        profileSummary,
      })
      queries = queryResult.queries
    } catch {
      queries = []
    }

    const results = await searchCompanyCandidates(criteria)
    candidates = results.candidates
    provider = results.provider

    if (queries.length > 0 && candidates.length < 10) {
      for (const query of queries.slice(0, 5)) {
        try {
          const extra = await import("@/lib/connectors/companies/tavily").then(
            (m) => m.tavilySearch(query, { maxResults: 5 })
          )
          for (const r of extra) {
            const domain = (() => {
              try {
                return new URL(r.url).hostname.replace(/^www\./, "")
              } catch {
                return null
              }
            })()
            if (domain && !candidates.some((c) => c.domain === domain)) {
              candidates.push({
                name: r.title.replace(/[-–|].*$/, "").trim().slice(0, 100),
                domain,
                website: `https://${domain}`,
                sector: criteria.sectors[0] ?? null,
                size_min: criteria.size_min,
                size_max: criteria.size_max,
                headquarters: criteria.locations[0] ?? null,
                locations: criteria.locations,
                remote_ok: criteria.remote,
                description: r.snippet.slice(0, 500),
                discovery_type: "spontaneous",
                sourceUrl: r.url,
                reasons: [`Score web: ${Math.round(r.score * 100)}%`, r.snippet.slice(0, 120)],
              })
            }
          }
        } catch {
          // continue
        }
      }
    }
  } else {
    const results = await searchCompanyCandidates(criteria)
    candidates = results.candidates
    provider = results.provider
  }

  onStep?.("enrich")
  const saved: Company[] = []
  const toScore = candidates.slice(0, COMPANIES_PER_SEARCH)
  const BATCH_SIZE = 3

  const extractedPages = new Map<string, ExtractResult>()
  if (COMPANY_PROVIDER === "tavily") {
    const urlsToExtract = toScore
      .filter((c) => c.website)
      .slice(0, 10)
      .map((c) => c.website!)
    if (urlsToExtract.length > 0) {
      try {
        const pages = await tavilyExtract(urlsToExtract)
        for (const page of pages) {
          try {
            const domain = new URL(page.url).hostname.replace(/^www\./, "")
            extractedPages.set(domain, page)
          } catch { /* skip invalid urls */ }
        }
      } catch (err) {
        console.error("[company-prospecting] tavilyExtract failed:", err)
      }
    }
  }

  async function processOneCandidate(candidate: CompanyCandidate): Promise<Company | null> {
    const reasons = candidate.reasons.slice(0, 3)
    let matchScore: number
    let enrichment: Record<string, unknown>

    if (COMPANY_PROVIDER === "tavily" && candidate.website) {
      const extracted = extractedPages.get(candidate.domain)
      const extractedContent = extracted?.content ?? ""

      try {
        const [websiteText, careersText] = await Promise.all([
          fetchCompanyWebsiteText(candidate.website).catch(() => ""),
          fetchCompanyCareersText(candidate.website).catch(() => ""),
        ])

        const fullText = [extractedContent, websiteText, careersText].filter(Boolean).join("\n\n")

        if (fullText.length > 200) {
          const { enrichment: aiEnrichment } = await enrichCompanyText({
            companyName: candidate.name,
            websiteText: fullText.slice(0, 12000),
            careersText: careersText.slice(0, 8000),
            snippet: candidate.description ?? "",
          })
          enrichment = {
            activity: aiEnrichment.activity,
            products: aiEnrichment.products,
            positioning: aiEnrichment.positioning,
            keywords: aiEnrichment.keywords,
            sector: aiEnrichment.sector,
            headquarters: aiEnrichment.headquarters,
            size_min: aiEnrichment.size_min,
            size_max: aiEnrichment.size_max,
            sources: aiEnrichment.sources,
            extracted_at: new Date().toISOString(),
          }
        } else {
          enrichment = mockEnrichment(candidate, reasons)
        }
      } catch {
        enrichment = mockEnrichment(candidate, reasons)
      }

      matchScore = computeCompanyMatchScore(criteria, candidateToScoreInput(candidate), weights)
    } else {
      matchScore = computeCompanyMatchScore(criteria, candidateToScoreInput(candidate), weights)
      enrichment = mockEnrichment(candidate, reasons)
    }

    matchScore = Math.max(0, Math.min(100, Math.round(matchScore)))

    const { data: inserted, error } = await supabase
      .from("companies")
      .upsert(
        {
          user_id: userId,
          search_id: searchId,
          name: candidate.name,
          slug: slugify(candidate.name),
          domain: candidate.domain,
          website: candidate.website,
          logo_url: null,
          sectors: candidate.sector ? [candidate.sector] : [],
          industry: candidate.sector,
          size_min: candidate.size_min,
          size_max: candidate.size_max,
          headquarters: candidate.headquarters,
          locations: candidate.locations ?? [],
          remote_ok: candidate.remote_ok,
          description: candidate.description,
          discovery_type: candidate.discovery_type,
          ai_enriched: enrichment,
          match_score: matchScore,
          opportunity_score: null,
          opportunity_breakdown: {},
          status: "to_contact",
          next_action_at: null,
          outcome_reason: null,
          notes: null,
        },
        { onConflict: "user_id,domain", ignoreDuplicates: true }
      )
      .select()
      .single()

    if (error) {
      console.error(`[company-prospecting] upsert failed for ${candidate.domain}:`, error.message)
      return null
    }
    if (!inserted) return null

    const extractedForCandidate = extractedPages.get(candidate.domain)
    const contacts = buildContactsForCompany(extractedForCandidate?.content)
    await supabase
      .from("company_contacts")
      .upsert(
        contacts.map((contact) => ({
          user_id: userId,
          company_id: inserted.id,
          name: contact.name,
          role_title: contact.role_title,
          role_type: contact.role_type,
          linkedin_url: contact.linkedin_url,
          email: contact.email,
          email_confidence: contact.email_confidence,
          relevance_score: contact.relevance_score,
          active: contact.active,
          current_company: contact.current_company,
          source: contact.source,
          notes: contact.notes,
          relevance_factors: contact.relevance_factors,
        }))
      )

    const companyScoreInput: CompanyScoreInput = {
      name: inserted.name,
      sector: inserted.industry,
      sectors: inserted.sectors,
      keywords: (inserted.ai_enriched?.keywords as string[]) ?? [],
      headquarters: inserted.headquarters,
      locations: inserted.locations,
      remote_ok: inserted.remote_ok,
      size_min: inserted.size_min,
      size_max: inserted.size_max,
    }

    const contactsForScore = contacts.map((contact) => ({
      relevance_score: contact.relevance_score,
    }))
    const opportunity = computeOpportunityScore({
      matchScore: inserted.match_score,
      criteria,
      company: companyScoreInput,
      contacts: contactsForScore,
    })

    await supabase
      .from("companies")
      .update({
        opportunity_score: opportunity.score,
        opportunity_breakdown: opportunity.breakdown,
      })
      .eq("id", inserted.id)
      .eq("user_id", userId)

    return { ...(inserted as Company), opportunity_score: opportunity.score }
  }

  for (let i = 0; i < toScore.length; i += BATCH_SIZE) {
    const batch = toScore.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map((c) => processOneCandidate(c)))
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        saved.push(result.value)
        onCompany?.(result.value, saved.length, toScore.length)
      }
    }
  }

  onStep?.("done")
  const { data: search, error: searchError } = await supabase
    .from("company_searches")
    .update({
      status: "done",
      results_found: candidates.length,
      companies_added: saved.length,
      raw: candidates,
    })
    .eq("id", searchId)
    .eq("user_id", userId)
    .select()
    .single()

  if (searchError) {
    throw new Error(`Failed to finalize company search: ${searchError.message}`)
  }

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .eq("search_id", searchId)

  if (companiesError) {
    throw new Error(`Failed to reload companies: ${companiesError.message}`)
  }

  return {
    companies: (companies as Company[]) ?? [],
    search: search as CompanySearch,
    provider,
  }
}

export async function generateOutreachForCompany(input: {
  supabase: SupabaseClient
  userId: string
  companyId: string
  apiKey?: string | null
}): Promise<OutreachMessage[]> {
  const { supabase, userId, companyId, apiKey } = input

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", userId)
    .single()
  if (companyError || !company) {
    throw new Error("Company not found")
  }

  const { data: contacts } = await supabase
    .from("company_contacts")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("relevance_score", { ascending: false })

  const { data: profile } = await supabase
    .from("profiles")
    .select("cv_text, target_roles, skills, keywords, preferred_industries, years_experience")
    .eq("id", userId)
    .maybeSingle()

  const rolesValue = profile?.target_roles
  const roles =
    Array.isArray(rolesValue) && rolesValue.length > 0
      ? (rolesValue as string[])
      : ["Product Owner", "Product Manager"]

  const skillsValue = profile?.skills
  const keywordsValue = profile?.keywords
  const cvText = profile?.cv_text

  const profileSummary =
    [
      `Postes visés : ${roles.join(", ")}`,
      Array.isArray(skillsValue) && skillsValue.length > 0
        ? `Compétences : ${skillsValue.join(", ")}`
        : "",
      Array.isArray(keywordsValue) && keywordsValue.length > 0
        ? `Mots-clés : ${keywordsValue.join(", ")}`
        : "",
      `Expérience : ${profile?.years_experience ?? "non précisée"} ans`,
      typeof cvText === "string" ? cvText.slice(0, 1500) : "",
    ]
      .filter(Boolean)
      .join("\n")

  const bestContact = (contacts as CompanyContact[] | null)?.[0]
  const targetCompany = company as Company
  const enriched = (targetCompany.ai_enriched ?? {}) as Record<string, unknown>

  const companyFacts = [
    `Nom : ${targetCompany.name}`,
    `Site : ${targetCompany.website ?? "non communiqué"}`,
    `Secteur : ${targetCompany.industry ?? enriched.sector ?? "non précisé"}`,
    `Siège : ${targetCompany.headquarters ?? enriched.headquarters ?? "non précisé"}`,
    `Taille : ${targetCompany.size_min ?? "?"}–${targetCompany.size_max ?? "?"} salariés`,
    `Remote : ${targetCompany.remote_ok ? "oui" : "non"}`,
    enriched.activity ? `Activité : ${enriched.activity}` : "",
    enriched.products ? `Produits : ${enriched.products}` : "",
    enriched.positioning ? `Positionnement : ${enriched.positioning}` : "",
    Array.isArray(enriched.keywords) && enriched.keywords.length > 0
      ? `Mots-clés : ${(enriched.keywords as string[]).join(", ")}`
      : "",
    Array.isArray(enriched.sources) && (enriched.sources as string[]).length > 0
      ? `Sources : ${(enriched.sources as string[]).join(", ")}`
      : "",
  ].filter(Boolean).join("\n")

  const { outreach } = await generateCompanyOutreach(
    {
      profileSummary,
      companyEnrichment: companyFacts,
      companyName: targetCompany.name,
      website: targetCompany.website,
      contactName: bestContact?.name ?? "",
      roles,
    },
    { apiKey }
  )

  const messages: OutreachMessage[] = []
  for (const kind of ["email", "linkedin"] as const) {
    const subject = kind === "email" ? outreach.email_subject : `LinkedIn — ${targetCompany.name}`
    const body = kind === "email" ? outreach.email_body : outreach.linkedin_message
    const { data: message, error } = await supabase
      .from("outreach_messages")
      .insert({
        user_id: userId,
        company_id: companyId,
        contact_id: bestContact?.id ?? null,
        kind,
        subject,
        body,
        status: "ready",
        sent_at: null,
        response_received_at: null,
      })
      .select()
      .single()
    if (!error && message) messages.push(message as OutreachMessage)
  }

  if (targetCompany.status === "to_contact" || targetCompany.status === "contact_found") {
    await supabase
      .from("companies")
      .update({ status: "message_prepared", next_action_at: new Date().toISOString() })
      .eq("id", companyId)
      .eq("user_id", userId)
  }

  return messages
}