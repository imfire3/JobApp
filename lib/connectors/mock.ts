import { randomUUID } from "crypto";
import type { ImportedJob, TrackedSearch } from "@/types";
import type { ConnectorSourceKey, JobConnector, JobConnectorOptions } from "./types";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface WttjCompany {
  name: string;
  slug: string;
  industry: string;
  defaultRemote: boolean;
}

const WTTJ_COMPANIES: WttjCompany[] = [
  { name: "Alan", slug: "alan", industry: "Healthtech", defaultRemote: true },
  { name: "Doctolib", slug: "doctolib", industry: "Healthtech", defaultRemote: true },
  { name: "Back Market", slug: "back-market", industry: "Marketplace", defaultRemote: false },
  { name: "BlaBlaCar", slug: "blablacar", industry: "Mobility", defaultRemote: true },
  { name: "PayFit", slug: "payfit", industry: "HR Tech", defaultRemote: true },
  { name: "Qonto", slug: "qonto", industry: "Fintech", defaultRemote: true },
  { name: "Swile", slug: "swile", industry: "HR Tech", defaultRemote: true },
  { name: "ManoMano", slug: "manomano", industry: "Marketplace", defaultRemote: true },
  { name: "Mistral AI", slug: "mistral-ai", industry: "AI", defaultRemote: true },
  { name: "Datadog", slug: "datadog", industry: "SaaS", defaultRemote: true },
];

const SOURCE_META: Record<
  Exclude<ConnectorSourceKey, "welcome-to-the-jungle">,
  { name: string; source: string; companies: string[]; urlPrefix: string }
> = {
  linkedin: {
    name: "Mock — LinkedIn Jobs",
    source: "LinkedIn",
    companies: ["Doctolib", "Mistral AI", "Datadog"],
    urlPrefix: "https://www.linkedin.com/jobs/view",
  },
  indeed: {
    name: "Mock — Indeed",
    source: "Indeed",
    companies: ["Capgemini Invent", "BlaBlaCar", "Orange"],
    urlPrefix: "https://fr.indeed.com/viewjob",
  },
};

function resolveRemote(search: TrackedSearch, company: WttjCompany): boolean {
  if (search.remote_preference === "remote_only") return true;
  if (search.remote_preference === "onsite") return false;
  if (search.remote_preference === "hybrid") return search.hybrid || company.defaultRemote;
  return company.defaultRemote || search.hybrid;
}

function formatSalary(minimum: number | null, currency: string, spread = 12000): string {
  if (!minimum) return "45K à 55K €";
  const low = Math.round(minimum / 1000);
  const high = Math.round((minimum + spread) / 1000);
  const symbol = currency === "EUR" ? "€" : currency;
  return `${low}K à ${high}K ${symbol}`;
}

function pickLocation(search: TrackedSearch, index: number): string {
  if (search.locations.length > 0) {
    return search.locations[index % search.locations.length];
  }
  return "Paris";
}

function buildWttjDescription(params: {
  title: string;
  company: WttjCompany;
  search: TrackedSearch;
  location: string;
  remote: boolean;
  contractType: string;
}): string {
  const keywords = params.search.keywords.length
    ? params.search.keywords.join(", ")
    : "product discovery, roadmap, delivery, stakeholder management";
  const industries = params.search.industries.length
    ? params.search.industries.join(", ")
    : params.company.industry;
  const culture = params.search.company_culture
    ? ` Culture fit: ${params.search.company_culture}.`
    : "";

  const workplace = params.remote
    ? "Full remote possible within France."
    : params.search.hybrid
      ? "Hybrid setup (2–3 days/week in office)."
      : `On-site role in ${params.location}.`;

  return [
    `${params.company.name} is hiring a ${params.title} to join a cross-functional product squad.`,
    `You will own prioritization, discovery workshops, and delivery coordination with engineering and design.`,
    `Key topics: ${keywords}.`,
    `Industry context: ${industries}.`,
    `Contract: ${contractTypeLabel(params.contractType)}.`,
    workplace,
    culture,
    `Tracked search: "${params.search.name}".`,
  ].join(" ");
}

function contractTypeLabel(contractType: string): string {
  const map: Record<string, string> = {
    CDI: "permanent contract (CDI)",
    CDD: "fixed-term contract (CDD)",
    Freelance: "freelance mission",
    Stage: "internship",
  };
  return map[contractType] ?? contractType;
}

function generateWttjJobs(options: JobConnectorOptions): ImportedJob[] {
  const search = options.trackedSearch;
  const titles =
    search.job_titles.length > 0
      ? search.job_titles
      : options.roles?.length
        ? options.roles
        : ["Product Manager", "Product Owner"];

  const contractType = search.contract_types[0] ?? "CDI";
  const postedOffsets = [2, 8, 14, 22, 36]; // last one >24h for filter testing

  return titles.flatMap((title, titleIndex) => {
    const company = WTTJ_COMPANIES[(titleIndex + slugify(search.name).length) % WTTJ_COMPANIES.length];
    const location = pickLocation(search, titleIndex);
    const remote = resolveRemote(search, company);
    const suffix = randomUUID().slice(0, 8);
    const jobSlug = slugify(`${title}-${location}-${search.name}`);

    return postedOffsets.map((hours, offsetIndex) => ({
      title: offsetIndex === 0 && titleIndex === 0 ? title : enrichTitle(title, offsetIndex),
      company: company.name,
      source: "welcome_to_the_jungle",
      contract_type: contractType,
      location: `${location}, France`,
      remote,
      salary: formatSalary(search.minimum_salary, search.currency),
      posted_at: hoursAgo(hours),
      url: `https://www.welcometothejungle.com/fr/companies/${company.slug}/jobs/${jobSlug}-${suffix}-${offsetIndex}`,
      description: buildWttjDescription({
        title,
        company,
        search,
        location,
        remote,
        contractType,
      }),
    }));
  });
}

function enrichTitle(baseTitle: string, variant: number): string {
  const prefixes = ["Senior", "Lead", "Principal"];
  const suffixes = ["— Growth", "— Platform", "— B2B", "— Data"];

  if (variant === 1) return `${prefixes[variant % prefixes.length]} ${baseTitle}`;
  if (variant === 2) return `${baseTitle} ${suffixes[variant % suffixes.length]}`;
  if (variant === 3) return `${baseTitle} (H/F)`;
  return baseTitle;
}

class MockWttjConnector implements JobConnector {
  key = "welcome-to-the-jungle" as const;
  name = "Mock — Welcome to the Jungle";
  source = "Welcome to the Jungle";

  async fetchJobs(options: JobConnectorOptions): Promise<ImportedJob[]> {
    return generateWttjJobs(options);
  }
}

class MockGenericConnector implements JobConnector {
  constructor(public key: Exclude<ConnectorSourceKey, "welcome-to-the-jungle">) {}

  get name() {
    return SOURCE_META[this.key].name;
  }

  get source() {
    return SOURCE_META[this.key].source;
  }

  async fetchJobs(options: JobConnectorOptions): Promise<ImportedJob[]> {
    const meta = SOURCE_META[this.key];
    const search = options.trackedSearch;
    const title = options.roles?.[0] ?? search.job_titles[0] ?? "Product Manager";
    const location = options.location ?? search.locations[0] ?? "Paris";
    const slug = slugify(search.name || title);

    return [
      {
        title,
        company: meta.companies[0],
        source: meta.source,
        location,
        remote: search.remote_preference === "remote_only",
        salary: formatSalary(search.minimum_salary, search.currency),
        posted_at: hoursAgo(6),
        url: `${meta.urlPrefix}/${slug}-${randomUUID().slice(0, 8)}`,
        description: `Mock ${meta.source} listing for ${title} in ${location}.`,
      },
    ];
  }
}

/** Mock mode uses WTTJ only — realistic listings derived from tracked search criteria. */
export function createMockConnectors(): JobConnector[] {
  return [new MockWttjConnector()];
}

export { MockWttjConnector };
