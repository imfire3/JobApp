/**
 * Upsert ATS taxonomy into Supabase from the TypeScript catalog (PostgREST, no realtime).
 *
 * Usage:
 *   npx tsx scripts/seed-ats-keywords.ts
 *
 * Prerequisites:
 *   1. Apply supabase/migrations/020_ats_keywords.sql in the SQL editor
 *   2. NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  ATS_KEYWORD_DEFINITIONS,
  ATS_ROLE_DEFINITIONS,
  ATS_ROLE_IMPORTANCE,
} from "../lib/ats/catalog"
import { buildAtsCatalog, normalizeAtsName } from "../lib/ats/index"

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const i = line.indexOf("=")
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

async function rest<T>(
  baseUrl: string,
  serviceKey: string,
  path: string,
  init: RequestInit & { prefer?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  }
  if (init.prefer) headers.Prefer = init.prefer

  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`)
  }
  if (!text) return [] as T
  return JSON.parse(text) as T
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  const catalog = buildAtsCatalog(ATS_KEYWORD_DEFINITIONS)
  console.log(`Upserting ${catalog.length} keywords…`)

  const keywordRows = catalog.map((row) => ({
    canonical_name: row.canonical_name,
    normalized_name: row.normalized_name,
    category: row.category,
    subcategory: row.subcategory ?? null,
    skill_type: row.skill_type ?? null,
    priority: row.priority ?? null,
    aliases_fr: row.aliases_fr ?? [],
    aliases_en: row.aliases_en ?? [],
    ats_weight: row.ats_weight ?? 0.5,
    specificity_weight: row.specificity_weight ?? 0.5,
    description: row.description ?? null,
  }))

  const chunkSize = 100
  for (let i = 0; i < keywordRows.length; i += chunkSize) {
    const chunk = keywordRows.slice(i, i + chunkSize)
    await rest(url, serviceKey, "ats_keywords?on_conflict=normalized_name", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(chunk),
    })
  }

  console.log(`Upserting ${ATS_ROLE_DEFINITIONS.length} roles…`)
  await rest(url, serviceKey, "ats_roles?on_conflict=role_name", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(
      ATS_ROLE_DEFINITIONS.map((role) => ({
        role_name: role.role_name,
        role_family: role.role_family,
        seniority: role.seniority,
      }))
    ),
  })

  const roles = await rest<Array<{ id: string; role_name: string }>>(
    url,
    serviceKey,
    "ats_roles?select=id,role_name"
  )
  const keywords = await rest<
    Array<{ id: string; canonical_name: string; ats_weight: number }>
  >(url, serviceKey, "ats_keywords?select=id,canonical_name,ats_weight")

  const roleIdByName = new Map(roles.map((r) => [r.role_name, r.id]))

  const linkRows: Array<{
    role_id: string
    keyword_id: string
    importance: number
    required_level: string | null
  }> = []

  for (const role of ATS_ROLE_DEFINITIONS) {
    const roleId = roleIdByName.get(role.role_name)
    if (!roleId) continue
    const overrides = ATS_ROLE_IMPORTANCE[role.role_name] ?? {}

    for (const keyword of keywords) {
      const override = overrides[keyword.canonical_name]
      const importance =
        typeof override === "number" ? override : Number(keyword.ats_weight ?? 0.5)
      if (typeof override !== "number" && importance < 0.75) continue
      linkRows.push({
        role_id: roleId,
        keyword_id: keyword.id,
        importance,
        required_level:
          typeof override === "number" && override >= 0.9 ? "required" : null,
      })
    }
  }

  console.log(`Upserting ${linkRows.length} role↔keyword links…`)
  for (let i = 0; i < linkRows.length; i += chunkSize) {
    const chunk = linkRows.slice(i, i + chunkSize)
    await rest(
      url,
      serviceKey,
      "ats_role_keywords?on_conflict=role_id,keyword_id",
      {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: JSON.stringify(chunk),
      }
    )
  }

  console.log("Done.", {
    keywords: catalog.length,
    roles: ATS_ROLE_DEFINITIONS.length,
    links: linkRows.length,
    sampleNormalized: normalizeAtsName("Critères d'acceptation"),
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
