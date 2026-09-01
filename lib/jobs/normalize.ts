/**
 * Parse salary strings such as "45K à 55K €", "60k-72k EUR", "500 €/jour".
 */
export function parseSalaryRange(value: string | null | undefined): {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: string;
} {
  if (!value?.trim()) {
    return { salary_min: null, salary_max: null, salary_currency: "EUR", salary_period: "year" };
  }

  const raw = value.trim();
  const lower = raw.toLowerCase();

  let salary_period = "year";
  if (/(jour|day|\/d)/i.test(lower)) salary_period = "day";
  else if (/(mois|month|\/m)/i.test(lower)) salary_period = "month";

  let salary_currency = "EUR";
  if (/\$|usd/i.test(raw)) salary_currency = "USD";
  else if (/£|gbp/i.test(raw)) salary_currency = "GBP";
  else if (/€|eur/i.test(raw)) salary_currency = "EUR";

  const numbers = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*(k|K)?/g)].map((match) => {
    const base = Number(match[1].replace(",", "."));
    const isThousands = Boolean(match[2]);
    if (Number.isNaN(base)) return null;
    const amount = isThousands || base <= 999 ? Math.round(base * 1000) : Math.round(base);
    return amount;
  }).filter((value): value is number => value !== null);

  if (numbers.length === 0) {
    return { salary_min: null, salary_max: null, salary_currency, salary_period };
  }

  const salary_min = Math.min(...numbers);
  const salary_max = numbers.length > 1 ? Math.max(...numbers) : salary_min;

  return { salary_min, salary_max, salary_currency, salary_period };
}

/**
 * Parse experience tags such as "> 3 ans", "3+ years", "minimum 5 ans".
 */
export function parseExperienceMinYears(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;

  const patterns = [
    /(?:>|≥|plus de|minimum|min\.?|at least)\s*(\d+)/i,
    /(\d+)\s*\+/,
    /(\d+)\s*(?:ans|years|yr)/i,
    /(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      const years = Number(match[1]);
      if (!Number.isNaN(years)) return years;
    }
  }

  return null;
}

export type RemoteMode = "onsite" | "hybrid" | "remote" | "unknown";

/**
 * Convert remote tags / booleans / French labels into remote_mode.
 */
export function parseRemoteMode(input: {
  remote?: boolean | string | null;
  location?: string | null;
  tags?: string[];
}): RemoteMode {
  const tags = (input.tags ?? []).map((tag) => tag.toLowerCase());
  const location = (input.location ?? "").toLowerCase();
  const remoteValue =
    typeof input.remote === "boolean"
      ? input.remote
        ? "remote"
        : "onsite"
      : String(input.remote ?? "").toLowerCase();

  const haystack = [remoteValue, location, ...tags].join(" ");

  if (/(full\s*remote|télétravail|teletravail|100\s*%?\s*remote|remote_only|\bremote\b)/i.test(haystack)) {
    return "remote";
  }
  if (/(hybrid|hybride|mixte|partial)/i.test(haystack)) {
    return "hybrid";
  }
  if (/(on[-\s]?site|présentiel|presentiel|bureau)/i.test(haystack)) {
    return "onsite";
  }
  if (remoteValue === "true" || remoteValue === "1" || remoteValue === "yes") return "remote";
  if (remoteValue === "false" || remoteValue === "0" || remoteValue === "no") return "onsite";
  if (!remoteValue && !location && tags.length === 0) return "unknown";
  return "unknown";
}

/**
 * Split a location string into city and country.
 */
export function parseLocation(value: string | null | undefined): {
  city: string | null;
  country: string;
} {
  if (!value?.trim()) {
    return { city: null, country: "France" };
  }

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { city: null, country: "France" };
  }

  if (parts.length === 1) {
    const single = parts[0];
    if (/france|europe|remote/i.test(single)) {
      return { city: null, country: normalizeCountry(single) };
    }
    return { city: single, country: "France" };
  }

  return {
    city: parts[0],
    country: normalizeCountry(parts[parts.length - 1]),
  };
}

function normalizeCountry(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("france")) return "France";
  if (lower.includes("belg")) return "Belgium";
  if (lower.includes("suisse") || lower.includes("switzerland")) return "Switzerland";
  if (lower.includes("europe")) return "Europe";
  return value;
}

const SOURCE_KEY_MAP: Record<string, string> = {
  welcome_to_the_jungle: "welcome_to_the_jungle",
  "welcome to the jungle": "welcome_to_the_jungle",
  wttj: "welcome_to_the_jungle",
  linkedin: "linkedin_jobs",
  "linkedin jobs": "linkedin_jobs",
  indeed: "indeed",
};

export function normalizeSourceKey(source: string | null | undefined): string {
  const normalized = (source ?? "").trim().toLowerCase();
  return SOURCE_KEY_MAP[normalized] ?? (normalized || "welcome_to_the_jungle");
}

export function formatSourceLabel(sourceKey: string): string {
  const labels: Record<string, string> = {
    welcome_to_the_jungle: "Welcome to the Jungle",
    linkedin_jobs: "LinkedIn",
    indeed: "Indeed",
  };
  return labels[sourceKey] ?? sourceKey.replace(/_/g, " ");
}

export function extractSourceJobId(url: string, sourceKey: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (sourceKey === "welcome_to_the_jungle") {
      const jobsIndex = segments.indexOf("jobs");
      if (jobsIndex >= 0 && segments[jobsIndex + 1]) {
        return segments[jobsIndex + 1];
      }
    }
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
}
