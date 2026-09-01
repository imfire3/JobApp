import type { ImportedJob, TrackedSearch } from "@/types";

export type ConnectorSourceKey = "welcome-to-the-jungle" | "linkedin" | "indeed";

export type JobSyncMode = "mock" | "apify";

export const CONNECTOR_SOURCES: Array<{
  key: ConnectorSourceKey;
  label: string;
}> = [
  { key: "welcome-to-the-jungle", label: "Welcome to the Jungle" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "indeed", label: "Indeed" },
];

/**
 * Contract for any job source connector (Apify actor, mock, etc.).
 * Connectors run server-side only — never in the browser.
 */
export interface JobConnector {
  key: ConnectorSourceKey;
  name: string;
  source: string;
  fetchJobs(options: JobConnectorOptions): Promise<ImportedJob[]>;
}

export interface JobConnectorOptions {
  trackedSearch: TrackedSearch;
  query?: string;
  location?: string;
  roles?: string[];
  keywords?: string[];
  excludedKeywords?: string[];
  maxResults?: number;
}

export interface ConnectorFetchResult {
  connector: string;
  source: string;
  jobs: ImportedJob[];
  error?: string;
}

export interface ConnectorRunLogInput {
  user_id: string;
  tracked_search_id: string;
  source: string;
  status: "running" | "success" | "failed";
  fetched_count?: number;
  inserted_count?: number;
  duplicate_count?: number;
  ignored_old_count?: number;
  error_message?: string | null;
  started_at: string;
  finished_at?: string | null;
}

export function mapTrackedSearchToConnectorOptions(
  trackedSearch: TrackedSearch
): JobConnectorOptions {
  const roles = trackedSearch.job_titles.length
    ? trackedSearch.job_titles
    : ["Product Owner", "Product Manager"];
  const location = trackedSearch.locations[0] ?? "Paris";

  return {
    trackedSearch,
    query: roles.join(" OR "),
    location,
    roles,
    keywords: trackedSearch.keywords,
    excludedKeywords: trackedSearch.excluded_keywords,
    maxResults: 50,
  };
}
