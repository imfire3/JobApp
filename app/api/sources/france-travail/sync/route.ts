import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { ensureUserSources } from "@/lib/sources/bootstrap"
import { syncFranceTravailSource } from "@/lib/sources/france-travail-sync"

/**
 * POST /api/sources/france-travail/sync
 * Source-scoped France Travail Offres d'emploi v2 sync.
 */
export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  await ensureUserSources(supabase, user.id)

  const { data: source, error: sourceError } = await supabase
    .from("job_sources")
    .select("id,slug")
    .eq("user_id", user.id)
    .eq("slug", "france-travail")
    .maybeSingle()

  if (sourceError || !source?.id) {
    return NextResponse.json(
      { error: "Source France Travail introuvable" },
      { status: 404 }
    )
  }

  const result = await syncFranceTravailSource(supabase, user.id, source.id)
  if (result.error && result.found === 0 && result.imported === 0) {
    const status = /non configurée/i.test(result.error) ? 503 : 500
    return NextResponse.json(
      {
        error: result.error,
        imported: 0,
        skipped: 0,
        found: 0,
        jobs: [],
      },
      { status }
    )
  }

  const analyze =
    new URL(request.url).searchParams.get("analyze") === "true"

  return NextResponse.json({
    message: "France Travail sync finished",
    imported: result.imported,
    skipped: result.skipped,
    found: result.found,
    jobIds: result.jobIds,
    analyze_requested: analyze,
    error: result.error ?? null,
  })
}
