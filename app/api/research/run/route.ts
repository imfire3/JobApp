import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import {
  parseResearchPlan,
  researchPlanSchema,
} from "@/lib/ai/schemas/research-plan"
import { runResearchPlan } from "@/lib/research/run-research"

/**
 * POST /api/research/run
 * Execute a research plan: live APIs when available, else imported jobs filter.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  let plan
  try {
    const body = await request.json()
    plan = parseResearchPlan(body?.plan ?? body)
    plan = researchPlanSchema.parse(plan)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid research plan"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const result = await runResearchPlan(supabase, user.id, plan)
    // #region agent log
    fetch("http://127.0.0.1:7429/ingest/b889d056-e3b9-407b-aa47-98348f117b99", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "e47afc",
      },
      body: JSON.stringify({
        sessionId: "e47afc",
        runId: "research-empty",
        hypothesisId: "A-E",
        location: "app/api/research/run/route.ts:POST",
        message: "research run result",
        data: {
          roles: plan.roles,
          location: plan.location,
          hours: plan.published_within_hours,
          source_slugs: plan.source_slugs,
          live_count: result.meta.live_count,
          imported_count: result.meta.imported_count,
          candidates: result.candidates.length,
          source_notes: result.meta.source_notes.map((n) => ({
            slug: n.slug,
            live_ready: n.live_ready,
            error: n.error ?? null,
            capability: n.capability,
          })),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return NextResponse.json({ plan, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Recherche impossible"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
