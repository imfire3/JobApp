import { randomUUID } from "crypto";
import { getAuthenticatedUser } from "@/lib/auth";
import { analyzeJobMatch } from "@/lib/openai/client";
import type { ImportableJobField, ImportedJob, SearchCriteria, SyncStatus } from "@/types";
import { IMPORTABLE_JOB_FIELDS } from "@/types";
import { buildNextSyncAt, normalizeCriteria } from "@/lib/sources/utils";

type Scope = { sourceId?: string; searchId?: string };
type SupabaseClientLike = Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"];

interface SyncResult {
  runs: number;
  imported: number;
  skipped: number;
  errors: string[];
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

interface SourceRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  sync_time: string;
}

interface SearchRow {
  id: string;
  name: string;
  criteria: SearchCriteria;
}

export async function runMockSyncForUser(scope?: Scope): Promise<SyncResult> {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) throw new Error(error ?? "Unauthorized");
  return runMockSyncForTarget(supabase, user.id, scope);
}

export async function runMockSyncForTarget(
  supabase: SupabaseClientLike,
  userId: string,
  scope?: Scope
): Promise<SyncResult> {
  const sourceQuery = supabase
    .from("job_sources")
    .select("id,name,slug,status,sync_time")
    .eq("user_id", userId)
    .eq("enabled", true);
  if (scope?.sourceId) sourceQuery.eq("id", scope.sourceId);

  const { data: sources, error: sourcesError } = await sourceQuery;
  if (sourcesError) throw new Error(sourcesError.message);
  if (!sources || sources.length === 0) {
    return { runs: 0, imported: 0, skipped: 0, errors: [], lastSyncAt: null, nextSyncAt: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("cv_text,target_roles,target_locations")
    .eq("id", userId)
    .maybeSingle();

  let runs = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();
  let nextSyncAt: string | null = null;

  for (const source of sources as SourceRow[]) {
    const searchQuery = supabase
      .from("source_searches")
      .select("id,name,criteria")
      .eq("user_id", userId)
      .eq("source_id", source.id)
      .eq("enabled", true);
    if (scope?.searchId) searchQuery.eq("id", scope.searchId);

    const { data: searches, error: searchesError } = await searchQuery;
    if (searchesError) {
      errors.push(`${source.name}: ${searchesError.message}`);
      continue;
    }

    for (const search of (searches ?? []) as SearchRow[]) {
      runs += 1;
      const runId = await createRun(supabase, userId, source.id, search.id, now);

      try {
        const jobs = generateMockJobs(source, search);
        let importedForSearch = 0;
        let skippedForSearch = 0;

        for (const job of jobs) {
          const { data: existing } = await supabase
            .from("jobs")
            .select("id")
            .eq("user_id", userId)
            .eq("url", job.url)
            .maybeSingle();

          if (existing) {
            skipped += 1;
            skippedForSearch += 1;
            continue;
          }

          const { data: inserted, error: insertError } = await supabase
            .from("jobs")
            .insert({
              user_id: userId,
              source: source.name,
              source_search_id: search.id,
              title: job.title,
              company: job.company,
              location: job.location,
              remote: job.remote,
              contract_type: job.contract_type,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              salary_currency: job.salary_currency,
              salary: job.salary,
              posted_at: job.posted_at,
              url: job.url,
              description: job.description,
              status: "new",
              imported_at: now,
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === "23505") {
              skipped += 1;
              skippedForSearch += 1;
              continue;
            }
            throw new Error(insertError.message);
          }

          imported += 1;
          importedForSearch += 1;
          await maybeAnalyzeInsertedJob(
            supabase,
            userId,
            inserted,
            profile?.cv_text ?? null,
            profile?.target_roles ?? [],
            profile?.target_locations ?? []
          );
        }

        await supabase
          .from("source_searches")
          .update({ last_run_at: now, last_result_count: jobs.length })
          .eq("id", search.id)
          .eq("user_id", userId);

        await finishRun(supabase, userId, runId, "success", jobs.length, importedForSearch, skippedForSearch, null);
        await createNotification(
          supabase,
          userId,
          "sync_completed",
          `${source.name} synced`,
          `${search.name}: ${jobs.length} found, ${importedForSearch} imported, ${skippedForSearch} duplicates`,
          {
            source_id: source.id,
            source_search_id: search.id,
            jobs_found: jobs.length,
            jobs_imported: importedForSearch,
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown sync error";
        errors.push(`${source.name} / ${search.name}: ${message}`);
        await finishRun(supabase, userId, runId, "failed", 0, 0, 0, message);
        await createNotification(
          supabase,
          userId,
          "sync_error",
          `${source.name} sync failed`,
          `${search.name}: ${message}`,
          {
            source_id: source.id,
            source_search_id: search.id,
          }
        );
      }
    }

    const sourceNextSyncAt = buildNextSyncAt(source.sync_time ?? "08:00");
    nextSyncAt = sourceNextSyncAt;
    await supabase
      .from("job_sources")
      .update({
        last_sync_at: now,
        next_sync_at: sourceNextSyncAt,
        jobs_imported_today: imported,
        status: errors.length > 0 ? "error" : source.status,
      })
      .eq("id", source.id)
      .eq("user_id", userId);
  }

  return { runs, imported, skipped, errors, lastSyncAt: now, nextSyncAt };
}

async function createRun(
  supabase: SupabaseClientLike,
  supabaseUserId: string,
  sourceId: string,
  sourceSearchId: string,
  startedAt: string
) {
  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      user_id: supabaseUserId,
      source_id: sourceId,
      source_search_id: sourceSearchId,
      status: "running",
      phase: "started",
      message: "Synchronization started",
      started_at: startedAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function finishRun(
  supabase: SupabaseClientLike,
  userId: string,
  runId: string,
  status: SyncStatus,
  jobsFound: number,
  jobsImported: number,
  jobsSkipped: number,
  errorMessage: string | null
) {
  await supabase
    .from("sync_logs")
    .update({
      status,
      phase: status === "failed" ? "error" : "completed",
      message:
        status === "failed"
          ? "Synchronization failed"
          : "Synchronization completed",
      finished_at: new Date().toISOString(),
      jobs_found: jobsFound,
      jobs_imported: jobsImported,
      jobs_skipped_duplicates: jobsSkipped,
      error_message: errorMessage,
    })
    .eq("id", runId)
    .eq("user_id", userId);
}

async function createNotification(
  supabase: SupabaseClientLike,
  userId: string,
  kind: string,
  title: string,
  body: string,
  payload: Record<string, unknown>
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    kind,
    title,
    body,
    payload,
  });
}

function generateMockJobs(source: SourceRow, search: SearchRow): ImportedJob[] {
  const criteria = normalizeCriteria(search.criteria);
  const importFields = normalizeImportFields(criteria);
  const role = criteria.job_titles[0] ?? "Product Manager";
  const location = criteria.location || "Paris";
  const remote = criteria.remote_preference === "remote_only";
  const salaryCurrency = criteria.salary_currency || "EUR";
  const minSalary = criteria.minimum_salary ?? 50000;
  const maxSalary = minSalary + 15000;
  const postedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const baseJob: ImportedJob = {
    source: importFields.includes("source") ? source.name : source.slug,
    source_search_id: search.id,
    title: importFields.includes("title") ? role : "Role not imported",
    company: importFields.includes("company") ? pickCompany(role) : "Company not imported",
    location: importFields.includes("location") ? location : undefined,
    remote: importFields.includes("remote") ? remote : false,
    contract_type: importFields.includes("contract_type")
      ? criteria.contract_types[0] ?? "CDI"
      : null,
    salary_min: importFields.includes("salary") ? minSalary : null,
    salary_max: importFields.includes("salary") ? maxSalary : null,
    salary_currency: importFields.includes("salary") ? salaryCurrency : null,
    salary: importFields.includes("salary")
      ? `${Math.round(minSalary / 1000)}k-${Math.round(maxSalary / 1000)}k ${salaryCurrency}`
      : undefined,
    posted_at: importFields.includes("posted_at")
      ? postedAt
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    url: `https://jobs.example.com/${source.slug}/${slugify(search.name)}-${randomUUID().slice(0, 8)}`,
    description: importFields.includes("description")
      ? buildDescription(role, criteria)
      : "Description not imported for this search.",
  };

  return [baseJob];
}

function normalizeImportFields(criteria: SearchCriteria): ImportableJobField[] {
  const raw = criteria.source_specific?.import_fields;
  if (!Array.isArray(raw) || raw.length === 0) return [...IMPORTABLE_JOB_FIELDS];
  return raw.filter((field): field is ImportableJobField =>
    IMPORTABLE_JOB_FIELDS.includes(field as ImportableJobField)
  );
}

function buildDescription(role: string, criteria: SearchCriteria): string {
  const keywords = criteria.keywords.length > 0 ? criteria.keywords.join(", ") : "product strategy";
  return `${role} role focused on roadmap ownership, discovery, and delivery. Looking for profiles with strengths in ${keywords}, stakeholder management, and data-informed prioritization.`;
}

function pickCompany(role: string): string {
  const map: Record<string, string> = {
    "Product Owner": "BlaBlaCar",
    "Product Manager": "Doctolib",
    "AI Product Manager": "Mistral AI",
    "Product Builder": "Alan",
  };
  return map[role] ?? "Back Market";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function maybeAnalyzeInsertedJob(
  supabase: SupabaseClientLike,
  userId: string,
  job: { id: string; title: string; company: string; location: string | null; remote: boolean; description: string | null },
  cvText: string | null,
  targetRoles: string[],
  targetLocations: string[]
) {
  if (!cvText || !process.env.OPENAI_API_KEY) return;

  try {
    const analysis = await analyzeJobMatch({
      cvText,
      targetRoles,
      targetLocations,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description ?? "",
      location: job.location ?? undefined,
      remote: job.remote,
    });

    await supabase
      .from("jobs")
      .update({
        match_score: analysis.match_score,
        match_reasons: analysis.match_reasons,
        match_gaps: analysis.match_gaps,
        cover_letter_angle: analysis.cover_letter_angle,
      })
      .eq("id", job.id)
      .eq("user_id", userId);
  } catch {
    // Keep sync resilient if AI analysis fails.
  }
}
