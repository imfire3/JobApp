import { addDays, set } from "date-fns";
import type { SearchCriteria } from "@/types";
import { EXPERIENCE_LEVELS } from "@/types";
import { DEFAULT_SEARCH_CRITERIA } from "@/lib/sources/constants";

export function buildNextSyncAt(time = "08:00"): string {
  const [hours, minutes] = time.split(":").map((v) => Number(v));
  const now = new Date();
  let next = set(now, { hours: hours || 8, minutes: minutes || 0, seconds: 0, milliseconds: 0 });
  if (next <= now) {
    next = addDays(next, 1);
  }
  return next.toISOString();
}

export function normalizeCriteria(input: unknown): SearchCriteria {
  const raw = (input ?? {}) as Partial<SearchCriteria>;
  return {
    ...DEFAULT_SEARCH_CRITERIA,
    ...raw,
    job_titles: ensureArray(raw.job_titles),
    experience_levels: ensureArray(raw.experience_levels).filter((value) =>
      EXPERIENCE_LEVELS.includes(value as (typeof EXPERIENCE_LEVELS)[number])
    ) as SearchCriteria["experience_levels"],
    contract_types: ensureArray(raw.contract_types),
    industries: ensureArray(raw.industries),
    excluded_industries: ensureArray(raw.excluded_industries),
    keywords: ensureArray(raw.keywords),
    excluded_keywords: ensureArray(raw.excluded_keywords),
    source_specific: (raw.source_specific ?? {}) as Record<string, unknown>,
  };
}

function ensureArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function slugToSourceName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
