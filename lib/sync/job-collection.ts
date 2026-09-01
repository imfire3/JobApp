import { getAuthenticatedUser } from "@/lib/auth";
import { buildJobInsertPayload } from "@/lib/jobs/mapper";
import {
  fetchJobsFromConnectors,
  getJobSyncMode,
  mapTrackedSearchToConnectorOptions,
} from "@/lib/connectors";
import type { ImportedJob, TrackedSearch } from "@/types";
import { buildNextSyncAt } from "@/lib/sources/utils";

type SupabaseClientLike = Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"];

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface JobCollectionResult {
  runs: number;
  imported: number;
  duplicates: number;
  ignored_old: number;
  errors: string[];
}

export interface JobCollectionScope {
  trackedSearchId?: string;
}

export async function runJobCollectionForUser(
  scope?: JobCollectionScope
): Promise<JobCollectionResult> {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) throw new Error(error ?? "Unauthorized");
  return runJobCollectionForTarget(supabase, user.id, scope);
}

export async function runJobCollectionForTarget(
  supabase: SupabaseClientLike,
  userId: string,
  scope?: JobCollectionScope
): Promise<JobCollectionResult> {
  const searchesQuery = supabase
    .from("tracked_searches")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (scope?.trackedSearchId) {
    searchesQuery.eq("id", scope.trackedSearchId);
  }

  const { data: searches, error: searchesError } = await searchesQuery;
  if (searchesError) throw new Error(searchesError.message);

  const activeSearches = (searches ?? []) as TrackedSearch[];
  if (activeSearches.length === 0) {
    return { runs: 0, imported: 0, duplicates: 0, ignored_old: 0, errors: [] };
  }

  let runs = 0;
  let imported = 0;
  let duplicates = 0;
  let ignoredOld = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  for (const trackedSearch of activeSearches) {
    let searchFetched = 0;
    let searchImported = 0;
    let searchDuplicates = 0;
    let searchIgnoredOld = 0;

    const connectorResults = await fetchJobsFromConnectors(
      mapTrackedSearchToConnectorOptions(trackedSearch)
    );

    for (const result of connectorResults) {
      runs += 1;
      const startedAt = new Date().toISOString();
      const logId = await createConnectorRunLog(supabase, {
        user_id: userId,
        tracked_search_id: trackedSearch.id,
        source: result.source,
        status: "running",
        started_at: startedAt,
      });

      if (result.error) {
        errors.push(`${trackedSearch.name} / ${result.source}: ${result.error}`);
        await finishConnectorRunLog(supabase, userId, logId, {
          status: "failed",
          fetched_count: 0,
          inserted_count: 0,
          duplicate_count: 0,
          ignored_old_count: 0,
          error_message: result.error,
          finished_at: new Date().toISOString(),
        });
        continue;
      }

      const filteredJobs = filterJobsForTrackedSearch(result.jobs, trackedSearch);
      const { freshJobs, ignoredCount } = partitionByRecency(filteredJobs);
      searchFetched += result.jobs.length;
      searchIgnoredOld += ignoredCount;

      let insertedForRun = 0;
      let duplicatesForRun = 0;

      for (const job of freshJobs) {
        const outcome = await insertJobIfNew(supabase, userId, trackedSearch.id, job, now);
        if (outcome === "inserted") {
          imported += 1;
          insertedForRun += 1;
          searchImported += 1;
        } else {
          duplicates += 1;
          duplicatesForRun += 1;
          searchDuplicates += 1;
        }
      }

      await finishConnectorRunLog(supabase, userId, logId, {
        status: "success",
        fetched_count: result.jobs.length,
        inserted_count: insertedForRun,
        duplicate_count: duplicatesForRun,
        ignored_old_count: ignoredCount,
        error_message: null,
        finished_at: new Date().toISOString(),
      });
    }

    await supabase
      .from("tracked_searches")
      .update({
        last_run: now,
        next_run: buildNextSyncAt("08:00"),
        jobs_found_today: searchFetched,
        jobs_imported: searchImported,
        duplicates_removed: searchDuplicates,
      })
      .eq("id", trackedSearch.id)
      .eq("user_id", userId);

    ignoredOld += searchIgnoredOld;
  }

  return { runs, imported, duplicates, ignored_old: ignoredOld, errors };
}

function filterJobsForTrackedSearch(jobs: ImportedJob[], trackedSearch: TrackedSearch) {
  const excludedKeywords = trackedSearch.excluded_keywords.map((value) => value.toLowerCase());
  const excludedIndustries = trackedSearch.excluded_industries.map((value) => value.toLowerCase());

  return jobs.filter((job) => {
    const haystack = `${job.title} ${job.company} ${job.description ?? ""}`.toLowerCase();
    if (excludedKeywords.some((keyword) => keyword && haystack.includes(keyword))) {
      return false;
    }
    if (excludedIndustries.some((industry) => industry && haystack.includes(industry))) {
      return false;
    }
    return true;
  });
}

function partitionByRecency(jobs: ImportedJob[]) {
  const freshJobs: ImportedJob[] = [];
  let ignoredCount = 0;

  for (const job of jobs) {
    if (job.posted_at && !isWithinLast24Hours(job.posted_at)) {
      ignoredCount += 1;
      continue;
    }
    freshJobs.push(job);
  }

  return { freshJobs, ignoredCount };
}

export function isWithinLast24Hours(postedAt: string) {
  const postedMs = new Date(postedAt).getTime();
  if (Number.isNaN(postedMs)) return true;
  return Date.now() - postedMs <= TWENTY_FOUR_HOURS_MS;
}

async function insertJobIfNew(
  supabase: SupabaseClientLike,
  userId: string,
  trackedSearchId: string,
  job: ImportedJob,
  scrapedAt: string
): Promise<"inserted" | "duplicate"> {
  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("url", job.url)
    .maybeSingle();

  if (existing) return "duplicate";

  const payload = buildJobInsertPayload({
    userId,
    trackedSearchId,
    job,
    rawData: {
      ...(job as unknown as Record<string, unknown>),
      experience_tag: "> 3 ans",
      remote_tag: job.remote ? "Télétravail" : job.location?.toLowerCase().includes("hybrid") ? "Hybride" : "Présentiel",
      scraper: "mock_wttj",
    },
    scrapedAt,
  });

  const { error: insertError } = await supabase.from("jobs").insert(payload as never);

  if (insertError) {
    if (insertError.code === "23505") return "duplicate";
    throw new Error(insertError.message);
  }

  return "inserted";
}

async function createConnectorRunLog(
  supabase: SupabaseClientLike,
  input: {
    user_id: string;
    tracked_search_id: string;
    source: string;
    status: "running" | "success" | "failed";
    started_at: string;
  }
) {
  const { data, error } = await supabase
    .from("connector_run_logs")
    .insert(input)
    .select("id")
    .single();

  if (error) {
    // Table may not exist yet during local setup — keep sync functional.
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }

  return data.id as string;
}

async function finishConnectorRunLog(
  supabase: SupabaseClientLike,
  userId: string,
  logId: string | null,
  update: {
    status: "success" | "failed";
    fetched_count: number;
    inserted_count: number;
    duplicate_count: number;
    ignored_old_count: number;
    error_message: string | null;
    finished_at: string;
  }
) {
  if (!logId) return;

  await supabase
    .from("connector_run_logs")
    .update(update)
    .eq("id", logId)
    .eq("user_id", userId);
}

export function getJobCollectionModeLabel() {
  return getJobSyncMode();
}
