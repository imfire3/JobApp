import type { CompanyCandidate, CompanySearchCriteria } from "@/types"
import { listMockCompanyCandidates } from "@/lib/connectors/companies/mock"

export const COMPANY_CONNECTOR_VERSION = (() => {
  if (process.env.TAVILY_API_KEY) return "tavily-v1"
  return "mock-v1"
})()

export const COMPANY_PROVIDER = (() => {
  const mode = (process.env.COMPANY_SEARCH_MODE ?? "auto").toLowerCase()
  if (mode === "mock") return "mock"
  if (mode === "tavily") return "tavily"
  if (mode === "live") return process.env.TAVILY_API_KEY ? "tavily" : "mock"
  if (process.env.TAVILY_API_KEY) return "tavily"
  return "mock"
})()

export async function searchCompanyCandidates(
  criteria: CompanySearchCriteria
): Promise<{ candidates: CompanyCandidate[]; provider: string }> {
  if (COMPANY_PROVIDER === "mock") {
    return {
      candidates: listMockCompanyCandidates(criteria),
      provider: "mock",
    }
  }

  if (COMPANY_PROVIDER === "tavily") {
    const { searchCompaniesViaTavily } = await import(
      "@/lib/connectors/companies/tavily"
    )
    return searchCompaniesViaTavily(criteria)
  }

  throw new Error(`Unsupported company provider: ${COMPANY_PROVIDER}`)
}