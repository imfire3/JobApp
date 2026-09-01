import { createApifyConnectors } from "./apify";
import { createMockConnectors } from "./mock";
import type { ConnectorFetchResult, JobConnector, JobConnectorOptions, JobSyncMode } from "./types";

export * from "./types";
export { createMockConnectors, MockWttjConnector } from "./mock";
export { createApifyConnectors, ApifyWttjConnector, ApifyLinkedInConnector } from "./apify";

export function getJobSyncMode(): JobSyncMode {
  const mode = process.env.JOB_SYNC_MODE?.trim().toLowerCase();
  return mode === "apify" ? "apify" : "mock";
}

export function getActiveConnectors(): JobConnector[] {
  const mode = getJobSyncMode();
  if (mode === "apify" && process.env.APIFY_TOKEN) {
    const apifyConnectors = createApifyConnectors();
    if (apifyConnectors.length > 0) {
      return apifyConnectors;
    }
  }
  return createMockConnectors();
}

export function getConnectorByKey(key: string): JobConnector | undefined {
  return getActiveConnectors().find((connector) => connector.key === key);
}

export async function fetchJobsFromConnectors(
  options: JobConnectorOptions
): Promise<ConnectorFetchResult[]> {
  const results: ConnectorFetchResult[] = [];

  for (const connector of getActiveConnectors()) {
    try {
      const jobs = await connector.fetchJobs(options);
      results.push({
        connector: connector.name,
        source: connector.source,
        jobs,
      });
    } catch (error) {
      results.push({
        connector: connector.name,
        source: connector.source,
        jobs: [],
        error: error instanceof Error ? error.message : "Unknown connector error",
      });
    }
  }

  return results;
}
