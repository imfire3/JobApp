import { MONTH_OPTIONS } from "@/lib/cv/experiences"

export function normalizeSelectValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "" || value === "__none__" || value === "none") {
    return ""
  }
  return value
}

export function monthLabel(value: string): string {
  const normalized = normalizeSelectValue(value)
  if (!normalized) return ""
  const found = MONTH_OPTIONS.find((m) => m.value === normalized)
  return found?.label ?? normalized
}

export function monthValueFromLabel(label: string): string {
  const found = MONTH_OPTIONS.find((m) => m.label.toLowerCase() === label.toLowerCase())
  return found?.value ?? ""
}

export const LOCATION_TYPE_OPTIONS = [
  { value: "onsite", label: "Sur site" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote", label: "Télétravail" },
] as const

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Alternance", label: "Alternance" },
  { value: "Stage", label: "Stage" },
  { value: "Freelance", label: "Freelance" },
  { value: "Indépendant", label: "Indépendant" },
  { value: "Autre", label: "Autre" },
] as const

export function yearOptions(): string[] {
  const current = new Date().getFullYear()
  const years: string[] = []
  for (let year = current + 1; year >= current - 40; year -= 1) {
    years.push(String(year))
  }
  return years
}
