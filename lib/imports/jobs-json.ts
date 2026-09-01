import {
  normalizeSourceKey,
  parseExperienceMinYears,
  parseLocation,
  parseRemoteMode,
  parseSalaryRange,
} from "@/lib/jobs/normalize";
import type { ParsedImportFile, ParsedImportRow, InvalidImportRow } from "@/lib/imports/jobs-file";

type ApifyRecord = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return "";
  return String(value).trim();
}

function pickString(item: ApifyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = asString(item[key]);
    if (value) return value;
  }
  return "";
}

function pickNestedString(item: ApifyRecord, path: string[]): string {
  let current: unknown = item;
  for (const segment of path) {
    if (!current || typeof current !== "object") return "";
    current = (current as ApifyRecord)[segment];
  }
  return asString(current);
}

function parsePostedAt(value: string): string | null {
  if (!value) return new Date().toISOString();
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function extractApifyItems(json: unknown): ApifyRecord[] {
  if (Array.isArray(json)) {
    return json.filter((item) => item && typeof item === "object") as ApifyRecord[];
  }

  if (json && typeof json === "object") {
    const record = json as ApifyRecord;
    for (const key of ["items", "data", "results", "jobs", "dataset"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value.filter((item) => item && typeof item === "object") as ApifyRecord[];
      }
    }
  }

  throw new Error(
    "Invalid Apify JSON. Expected an array of jobs or an object with an items/data/results array."
  );
}

export function normalizeApifyJobItem(
  item: ApifyRecord,
  rowNumber: number,
  defaultSource = "welcome_to_the_jungle"
): { row: ParsedImportRow | null; errors: string[]; raw: ApifyRecord } {
  const title = pickString(item, [
    "title",
    "jobTitle",
    "job_title",
    "position",
    "name",
  ]);
  const url = pickString(item, [
    "url",
    "jobUrl",
    "job_url",
    "link",
    "applyUrl",
    "apply_url",
  ]);
  const company =
    pickString(item, ["company", "companyName", "company_name", "organization"]) ||
    pickNestedString(item, ["organization", "name"]) ||
    pickNestedString(item, ["company", "name"]);

  const location =
    pickString(item, ["location", "city", "place", "office"]) ||
    [pickString(item, ["city"]), pickString(item, ["country"])].filter(Boolean).join(", ");

  const contractType =
    pickString(item, ["contract_type", "contractType", "contract", "employmentType"]) || null;

  const salary =
    pickString(item, ["salary", "salaryRange", "salary_range", "compensation", "remuneration"]) ||
    null;

  const experienceTag =
    pickString(item, ["experience", "experienceLevel", "experience_level", "seniority"]) || null;

  const description =
    pickString(item, ["description", "jobDescription", "job_description", "summary", "snippet"]) ||
    null;

  const sourceLabel =
    pickString(item, ["source", "platform", "site"]) || defaultSource;

  const remoteInput =
    item.remote ??
    item.isRemote ??
    item.is_remote ??
    item.workplaceType ??
    item.workplace_type ??
    item.remote_mode;

  const { city, country } = parseLocation(location || null);
  const remote_mode = parseRemoteMode({
    remote: remoteInput as string | boolean | null,
    location,
    tags: [pickString(item, ["workplaceType"]), pickString(item, ["tags"])],
  });
  const remote = remote_mode === "remote" || remote_mode === "hybrid";

  const postedRaw = pickString(item, [
    "posted_at",
    "postedAt",
    "published_at",
    "publishedAt",
    "datePosted",
    "date_posted",
    "createdAt",
  ]);
  const posted_at = parsePostedAt(postedRaw);

  const errors: string[] = [];
  if (!title) errors.push("title is required");
  if (!url) errors.push("url is required");
  if (!posted_at) errors.push("posted_at must be a valid date");

  const salaryParsed = parseSalaryRange(salary);
  const experience_min_years = parseExperienceMinYears(experienceTag);

  if (errors.length > 0 || !posted_at) {
    return { row: null, errors, raw: item };
  }

  return {
    row: {
      rowNumber,
      source: normalizeSourceKey(sourceLabel),
      title,
      company: company || "Unknown company",
      location: [city, country].filter(Boolean).join(", ") || location || null,
      remote,
      contract_type: contractType,
      salary,
      salary_min: salaryParsed.salary_min,
      salary_max: salaryParsed.salary_max,
      salary_currency: salaryParsed.salary_currency,
      posted_at,
      url,
      description,
      experience_min_years,
      remote_mode,
      raw_data: item,
    },
    errors: [],
    raw: item,
  };
}

export function parseJobsJsonText(text: string): ParsedImportFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file");
  }
  return parseJobsJson(parsed);
}

export function parseJobsJson(json: unknown): ParsedImportFile {
  const items = extractApifyItems(json);
  const rows: ParsedImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];
  const fileUrls = new Set<string>();
  let duplicatesWithinFile = 0;

  items.forEach((item, index) => {
    const rowNumber = index + 1;
    const normalized = normalizeApifyJobItem(item, rowNumber);

    if (normalized.errors.length > 0 || !normalized.row) {
      invalidRows.push({ rowNumber, errors: normalized.errors });
      return;
    }

    if (fileUrls.has(normalized.row.url)) {
      duplicatesWithinFile += 1;
      return;
    }

    fileUrls.add(normalized.row.url);
    rows.push(normalized.row);
  });

  if (duplicatesWithinFile > 0) {
    invalidRows.push({
      rowNumber: 0,
      errors: [`${duplicatesWithinFile} duplicate URL(s) were skipped inside the JSON file`],
    });
  }

  return {
    totalRows: items.length,
    rows,
    invalidRows,
  };
}
