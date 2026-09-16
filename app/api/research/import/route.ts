import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import { importResearchCandidates } from "@/lib/research/import-candidates"

const candidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  url: z.string().url(),
  location: z.string().nullable().optional(),
  posted_at: z.string().optional(),
  source: z.string().optional(),
  description: z.string().nullable().optional(),
  remote: z.boolean().optional(),
  contract_type: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  origin: z.enum(["live", "imported"]).optional().default("live"),
  job_id: z.string().uuid().optional(),
})

const bodySchema = z.object({
  candidates: z.array(candidateSchema).min(1).max(50),
  min_match_score: z.number().int().min(0).max(100).nullable().optional(),
})

/**
 * POST /api/research/import
 * Import live candidates / re-analyze imported ones; apply score threshold via selected.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const result = await importResearchCandidates(
      supabase,
      user.id,
      body.candidates.map((c) => ({
        id: c.id,
        title: c.title,
        company: c.company,
        url: c.url,
        location: c.location ?? null,
        posted_at: c.posted_at ?? new Date().toISOString(),
        source: c.source ?? "france_travail",
        description: c.description ?? null,
        remote: c.remote ?? false,
        contract_type: c.contract_type ?? null,
        salary: c.salary ?? null,
        origin: c.origin,
        job_id: c.job_id,
      })),
      body.min_match_score ?? null
    )
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import recherche impossible"
    const status = /cv/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
