import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import { generateResearchPlan } from "@/lib/ai/research-plan"
import { parseResearchPlan } from "@/lib/ai/schemas/research-plan"

const bodySchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
})

/**
 * POST /api/research/plan
 * Natural language → structured research plan.
 */
export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
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
    const { plan, promptVersion } = await generateResearchPlan(body.prompt)
    return NextResponse.json({
      plan: parseResearchPlan(plan),
      prompt_version: promptVersion,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de créer le plan"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
