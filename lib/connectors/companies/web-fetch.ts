const FETCH_TIMEOUT_MS = 8000
const MAX_CHARS = 12000

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "JobTracker/1.0 (+https://jobtracker.app)" },
      redirect: "follow",
    })
    if (!response.ok) return ""
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return ""
    }
    const raw = await response.text()
    const withoutTags = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
    const cleaned = withoutTags
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&eacute;/gi, "é")
      .replace(/&egrave;/gi, "è")
      .replace(/&agrave;/gi, "à")
      .replace(/&ccedil;/gi, "ç")
      .replace(/\s+/g, " ")
      .trim()
    return cleaned.slice(0, MAX_CHARS)
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchCompanyWebsiteText(website: string): Promise<string> {
  if (!/^https?:\/\//i.test(website)) return ""
  return fetchText(website)
}

const CAREERS_PATHS = ["/careers", "/careeres", "/jobs", "/carrieres", "/recrutement", "/join"]

export async function fetchCompanyCareersText(website: string): Promise<string> {
  if (!/^https?:\/\//i.test(website)) return ""
  const base = website.replace(/\/+$/, "")
  const results = await Promise.allSettled(
    CAREERS_PATHS.map((path) => fetchText(`${base}${path}`))
  )
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 200) {
      return result.value
    }
  }
  return ""
}