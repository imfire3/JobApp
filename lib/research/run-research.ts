import type { SupabaseClient } from "@supabase/supabase-js"
import type { ResearchPlan } from "@/lib/ai/schemas/research-plan"
import {
  ApifyLinkedInConnector,
  ApifyWttjConnector,
} from "@/lib/connectors/apify"
import { isFranceTravailConfigured } from "@/lib/connectors/france-travail/auth"
import { searchFranceTravailOffres } from "@/lib/connectors/france-travail/client"
import { hoursToPublieeDepuis } from "@/lib/research/hours-to-publiee-depuis"
import {
  filterImportedJobRows,
  type ImportedJobRow,
} from "@/lib/research/search-imported-jobs"
import {
  getSourceCapability,
  isApifyConfiguredForSlug,
} from "@/lib/sources/capabilities"
import type { TrackedSearch } from "@/types"

export type ResearchCandidateOrigin = "live" | "imported"

export type ResearchCandidate = {
  id: string
  title: string
  company: string
  url: string
  location: string | null
  posted_at: string
  source: string
  description: string | null
  remote: boolean
  contract_type: string | null
  salary: string | null
  origin: ResearchCandidateOrigin
  /** Set when origin=imported — existing jobs.id */
  job_id?: string
}

export type ResearchRunResult = {
  candidates: ResearchCandidate[]
  meta: {
    live_count: number
    imported_count: number
    publiee_depuis_days: number
    source_notes: Array<{
      slug: string
      capability: "live_api" | "imported_only"
      label: string
      detail: string
      live_ready: boolean
      error?: string
    }>
  }
}

function buildMotsCles(plan: ResearchPlan): string {
  const parts = [...plan.roles, ...plan.keywords]
    .map((p) => p.trim())
    .filter(Boolean)
  return Array.from(new Set(parts)).slice(0, 6).join(" ") || "Product Owner"
}

function candidateId(prefix: string, url: string, index: number): string {
  const slug = url.replace(/[^a-zA-Z0-9]+/g, "").slice(-20)
  return `${prefix}-${index}-${slug || "job"}`
}

function stubTrackedSearch(plan: ResearchPlan, userId: string): TrackedSearch {
  const now = new Date().toISOString()
  return {
    id: "research-ia",
    user_id: userId,
    name: "Recherche IA",
    enabled: true,
    job_titles: plan.roles,
    keywords: plan.keywords,
    excluded_keywords: [],
    locations: plan.location ? [plan.location] : [],
    maximum_distance: null,
    remote_preference: "any",
    hybrid: true,
    on_site: true,
    experience: [],
    contract_types: [],
    minimum_salary: null,
    maximum_salary: null,
    salary_period: "year",
    currency: "EUR",
    industries: [],
    excluded_industries: [],
    company_size: null,
    company_culture: null,
    company_names: [],
    languages: [],
    expertises: [],
    only_with_salary: false,
    exclusive_only: false,
    top_recruiter_only: false,
    start_date_preference: null,
    publish_window: null,
    ai_preferences: {},
    minimum_match_score: plan.min_match_score,
    last_run: null,
    next_run: null,
    jobs_found_today: 0,
    jobs_imported: 0,
    duplicates_removed: 0,
    average_ai_score: null,
    created_at: now,
    updated_at: now,
  }
}

async function fetchLiveFranceTravail(
  plan: ResearchPlan
): Promise<{ candidates: ResearchCandidate[]; found: number; error?: string }> {
  if (!isFranceTravailConfigured()) {
    return {
      candidates: [],
      found: 0,
      error: "France Travail API non configurée",
    }
  }
  try {
    const days = hoursToPublieeDepuis(plan.published_within_hours)
    const { jobs, rawCount } = await searchFranceTravailOffres({
      motsCles: buildMotsCles(plan),
      location: plan.location || null,
      publieeDepuis: days,
      maxResults: 50,
    })
    return {
      found: rawCount,
      candidates: jobs.map((job, index) => ({
        id: candidateId("live-ft", job.url, index),
        title: job.title,
        company: job.company,
        url: job.url,
        location: job.location ?? null,
        posted_at: job.posted_at,
        source: job.source || "france_travail",
        description: job.description,
        remote: job.remote,
        contract_type: job.contract_type ?? null,
        salary: job.salary ?? null,
        origin: "live" as const,
      })),
    }
  } catch (error) {
    return {
      candidates: [],
      found: 0,
      error:
        error instanceof Error
          ? error.message
          : "Échec de la recherche France Travail",
    }
  }
}

async function fetchLiveApify(
  plan: ResearchPlan,
  slug: "welcome-to-the-jungle" | "linkedin-jobs",
  userId: string
): Promise<{ candidates: ResearchCandidate[]; error?: string }> {
  if (!isApifyConfiguredForSlug(slug)) {
    return { candidates: [], error: "Apify non configuré" }
  }
  try {
    const connector =
      slug === "welcome-to-the-jungle"
        ? new ApifyWttjConnector()
        : new ApifyLinkedInConnector()
    const jobs = await connector.fetchJobs({
      trackedSearch: stubTrackedSearch(plan, userId),
      query: buildMotsCles(plan),
      location: plan.location || undefined,
      roles: plan.roles,
      keywords: plan.keywords,
      maxResults: 30,
      publieeDepuisDays: hoursToPublieeDepuis(plan.published_within_hours),
    })
    const prefix = slug === "welcome-to-the-jungle" ? "live-wttj" : "live-li"
    return {
      candidates: jobs.map((job, index) => ({
        id: candidateId(prefix, job.url, index),
        title: job.title,
        company: job.company,
        url: job.url,
        location: job.location ?? null,
        posted_at: job.posted_at,
        source: job.source,
        description: job.description,
        remote: job.remote,
        contract_type: job.contract_type ?? null,
        salary: job.salary ?? null,
        origin: "live" as const,
      })),
    }
  } catch (error) {
    return {
      candidates: [],
      error: error instanceof Error ? error.message : "Échec Apify",
    }
  }
}

async function fetchImportedCandidates(
  supabase: SupabaseClient,
  userId: string,
  plan: ResearchPlan,
  importedOnlySlugs: string[]
): Promise<ResearchCandidate[]> {
  if (importedOnlySlugs.length === 0) return []

  const planForFilter: ResearchPlan = {
    ...plan,
    source_slugs: importedOnlySlugs,
  }

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,title,company,url,city,country,description,source,published_at,scraped_at,remote_mode,contract_type,salary_min,salary_max"
    )
    .eq("user_id", userId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(300)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as ImportedJobRow[]
  const filtered = filterImportedJobRows(rows, planForFilter, { maxResults: 50 })

  // #region agent log
  {
    const sample = rows.slice(0, 8).map((r) => ({
      source: r.source,
      city: r.city,
      country: r.country,
      title: (r.title ?? "").slice(0, 60),
      published_at: r.published_at,
      scraped_at: r.scraped_at,
      hasUrl: Boolean(r.url?.trim()),
    }))
    const rejectStats = { noUrl: 0, source: 0, age: 0, location: 0, terms: 0, ok: 0 }
    const matchAll = planForFilter.source_slugs.includes("my-imported")
    const cutoffMs =
      Date.now() - planForFilter.published_within_hours * 60 * 60 * 1000
    const location = planForFilter.location.trim().toLowerCase()
    const terms = [...planForFilter.roles, ...planForFilter.keywords]
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    for (const row of rows) {
      if (!row.url?.trim()) {
        rejectStats.noUrl += 1
        continue
      }
      if (!matchAll) {
        /* source check counted in filter — approximate via outcome */
      }
      const published =
        row.published_at || row.scraped_at
          ? new Date(row.published_at || row.scraped_at || "").getTime()
          : null
      if (
        published != null &&
        Number.isFinite(published) &&
        published < cutoffMs
      ) {
        rejectStats.age += 1
        continue
      }
      if (location) {
        const hay =
          `${row.city ?? ""} ${row.country ?? ""} ${row.description ?? ""}`.toLowerCase()
        if (!hay.includes(location)) {
          rejectStats.location += 1
          continue
        }
      }
      if (terms.length > 0) {
        const hay =
          `${row.title ?? ""} ${row.description ?? ""} ${row.company ?? ""}`.toLowerCase()
        if (!terms.some((term) => hay.includes(term))) {
          rejectStats.terms += 1
          continue
        }
      }
      rejectStats.ok += 1
    }
    fetch("http://127.0.0.1:7429/ingest/b889d056-e3b9-407b-aa47-98348f117b99", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "e47afc",
      },
      body: JSON.stringify({
        sessionId: "e47afc",
        runId: "research-empty",
        hypothesisId: "B-C-D",
        location: "lib/research/run-research.ts:fetchImportedCandidates",
        message: "imported filter diagnostics",
        data: {
          dbRows: rows.length,
          filtered: filtered.length,
          importedSlugs: importedOnlySlugs,
          location: planForFilter.location,
          hours: planForFilter.published_within_hours,
          roles: planForFilter.roles,
          rejectStats,
          sample,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion

  return filtered.map((row, index) => ({
    id: row.id || candidateId("imp", row.url ?? String(index), index),
    title: row.title ?? "Sans titre",
    company: row.company ?? "Unknown",
    url: row.url ?? "",
    location: row.city ?? row.country ?? null,
    posted_at: row.published_at || row.scraped_at || new Date().toISOString(),
    source: row.source ?? "imported",
    description: row.description,
    remote: (row.remote_mode ?? "").toLowerCase().includes("remote"),
    contract_type: row.contract_type,
    salary:
      row.salary_min != null || row.salary_max != null
        ? `${row.salary_min ?? "?"}–${row.salary_max ?? "?"}`
        : null,
    origin: "imported" as const,
    job_id: row.id,
  }))
}

export async function runResearchPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: ResearchPlan
): Promise<ResearchRunResult> {
  const days = hoursToPublieeDepuis(plan.published_within_hours)
  const source_notes: ResearchRunResult["meta"]["source_notes"] = []
  const live: ResearchCandidate[] = []
  const importedSlugs: string[] = []

  for (const slug of plan.source_slugs) {
    const cap = getSourceCapability(slug)
    const note: (typeof source_notes)[number] = {
      slug,
      capability: cap.capability,
      label: cap.label,
      detail: cap.detail,
      live_ready: cap.liveReady,
    }

    if (cap.liveReady && slug === "france-travail") {
      const result = await fetchLiveFranceTravail(plan)
      live.push(...result.candidates)
      if (result.error) note.error = result.error
      source_notes.push(note)
      continue
    }

    if (
      cap.liveReady &&
      (slug === "welcome-to-the-jungle" || slug === "linkedin-jobs")
    ) {
      const result = await fetchLiveApify(plan, slug, userId)
      live.push(...result.candidates)
      if (result.error) note.error = result.error
      source_notes.push(note)
      continue
    }

    importedSlugs.push(slug)
    source_notes.push(note)
  }

  const imported = await fetchImportedCandidates(
    supabase,
    userId,
    plan,
    importedSlugs
  )

  // Dedupe by URL preferring live
  const byUrl = new Map<string, ResearchCandidate>()
  for (const c of imported) {
    if (c.url) byUrl.set(c.url, c)
  }
  for (const c of live) {
    if (c.url) byUrl.set(c.url, c)
  }

  const candidates = Array.from(byUrl.values())

  return {
    candidates,
    meta: {
      live_count: live.length,
      imported_count: imported.length,
      publiee_depuis_days: days,
      source_notes,
    },
  }
}
