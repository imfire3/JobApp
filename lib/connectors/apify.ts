import type { ImportedJob } from "@/types";
import type { ConnectorSourceKey, JobConnector, JobConnectorOptions } from "./types";

type ApifyItem = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = asString(value).toLowerCase();
  return ["true", "1", "yes", "remote", "hybrid"].includes(normalized);
}

function normalizeApifyItem(item: ApifyItem, source: string): ImportedJob | null {
  const title = asString(item.title ?? item.jobTitle ?? item.position);
  const url = asString(item.url ?? item.jobUrl ?? item.link ?? item.applyUrl);
  if (!title || !url) return null;

  const company = asString(item.company ?? item.companyName ?? item.organization, "Unknown");
  const location = asString(item.location ?? item.city ?? item.place, "") || undefined;
  const description = asString(item.description ?? item.jobDescription ?? item.summary, "");
  const salary = asString(item.salary ?? item.salaryRange ?? item.compensation, "") || undefined;
  const postedAt =
    asString(item.posted_at ?? item.postedAt ?? item.publishedAt ?? item.datePosted, "") ||
    new Date().toISOString();

  return {
    title,
    company,
    source,
    location,
    remote: asBoolean(item.remote ?? item.isRemote ?? item.workplaceType),
    salary,
    posted_at: postedAt,
    url,
    description,
  };
}

async function runApifyActor(actorId: string, input: Record<string, unknown>): Promise<ApifyItem[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN is not configured");
  }
  if (!actorId) {
    throw new Error("Apify actor ID is not configured");
  }

  const { ApifyClient } = await import("apify-client");
  const client = new ApifyClient({ token });
  const run = await client.actor(actorId).call(input, { waitSecs: 120 });
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 200 });
  return items as ApifyItem[];
}

function buildActorInput(options: JobConnectorOptions): Record<string, unknown> {
  const search = options.trackedSearch;
  return {
    search: options.query,
    query: options.query,
    jobTitles: options.roles,
    location: options.location,
    locations: search.locations,
    keywords: options.keywords,
    excludedKeywords: options.excludedKeywords,
    maxItems: options.maxResults ?? 50,
    limit: options.maxResults ?? 50,
    remote: search.remote_preference,
    contractTypes: search.contract_types,
    minimumSalary: search.minimum_salary,
    currency: search.currency,
  };
}

abstract class ApifyConnector implements JobConnector {
  abstract key: ConnectorSourceKey;
  abstract name: string;
  abstract source: string;
  abstract actorIdEnv: "APIFY_WTTJ_ACTOR_ID" | "APIFY_LINKEDIN_ACTOR_ID";

  async fetchJobs(options: JobConnectorOptions): Promise<ImportedJob[]> {
    const actorId = process.env[this.actorIdEnv];
    if (!actorId) {
      throw new Error(`${this.actorIdEnv} is not configured`);
    }

    const items = await runApifyActor(actorId, buildActorInput(options));
    return items
      .map((item) => normalizeApifyItem(item, this.source))
      .filter((job): job is ImportedJob => job !== null);
  }
}

export class ApifyWttjConnector extends ApifyConnector {
  key = "welcome-to-the-jungle" as const;
  name = "Apify — Welcome to the Jungle";
  source = "Welcome to the Jungle";
  actorIdEnv = "APIFY_WTTJ_ACTOR_ID" as const;
}

export class ApifyLinkedInConnector extends ApifyConnector {
  key = "linkedin" as const;
  name = "Apify — LinkedIn Jobs";
  source = "LinkedIn";
  actorIdEnv = "APIFY_LINKEDIN_ACTOR_ID" as const;
}

export function createApifyConnectors(): JobConnector[] {
  const connectors: JobConnector[] = [new ApifyWttjConnector(), new ApifyLinkedInConnector()];
  return connectors.filter((connector) => {
    if (connector.key === "welcome-to-the-jungle") {
      return Boolean(process.env.APIFY_WTTJ_ACTOR_ID);
    }
    if (connector.key === "linkedin") {
      return Boolean(process.env.APIFY_LINKEDIN_ACTOR_ID);
    }
    return true;
  });
}
