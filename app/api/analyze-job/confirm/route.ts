import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import {
  applyConfirmation,
  computeScoreFromCriteria,
  type CriterionConfirmation,
  type JobCriterionAssessment,
} from "@/lib/jobs/criteria-score"
import { toJobViewModel } from "@/lib/jobs/mapper"

const bodySchema = z.object({
  jobId: z.string().uuid(),
  criterionId: z.string().min(1),
  answer: z.enum(["yes", "no"]),
  detail: z.string().max(2000).optional().nullable(),
})

/**
 * POST /api/analyze-job/confirm
 * Apply a user confirmation on a criterion and recompute match_score deterministically.
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

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", body.jobId)
    .eq("user_id", user.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const existingRaw =
    job.raw_data && typeof job.raw_data === "object" && !Array.isArray(job.raw_data)
      ? (job.raw_data as Record<string, unknown>)
      : {}
  const existingJobFit =
    existingRaw.job_fit &&
    typeof existingRaw.job_fit === "object" &&
    !Array.isArray(existingRaw.job_fit)
      ? (existingRaw.job_fit as Record<string, unknown>)
      : {}

  const criteria = Array.isArray(existingJobFit.criteria_assessment)
    ? (existingJobFit.criteria_assessment as JobCriterionAssessment[])
    : []

  if (criteria.length === 0) {
    return NextResponse.json(
      { error: "Aucun critère à confirmer pour cette offre. Relance l’analyse d’abord." },
      { status: 400 }
    )
  }

  const target = criteria.find((item) => item.id === body.criterionId)
  if (!target) {
    return NextResponse.json({ error: "Critère introuvable" }, { status: 404 })
  }

  const confirmation: CriterionConfirmation = {
    criterion_id: body.criterionId,
    answer: body.answer,
    detail: body.detail?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const updatedCriteria = applyConfirmation(criteria, confirmation)
  const scored = computeScoreFromCriteria(updatedCriteria)

  const existingConfirmations = Array.isArray(existingJobFit.confirmations)
    ? (existingJobFit.confirmations as CriterionConfirmation[]).filter(
        (item) => item.criterion_id !== body.criterionId
      )
    : []
  existingConfirmations.push(confirmation)

  const strengths = updatedCriteria
    .filter((item) => item.evidence_level >= 2)
    .slice(0, 5)
    .map((item) => item.label)
  const gaps = updatedCriteria
    .filter((item) => item.evidence_level <= 1)
    .slice(0, 3)
    .map((item) => item.label)

  const { data: updated, error: updateError } = await supabase
    .from("jobs")
    .update({
      ai_match_score: scored.match_score,
      match_score: scored.match_score,
      ai_strengths: strengths,
      ai_gaps: gaps,
      match_reasons: strengths,
      match_gaps: gaps,
      raw_data: {
        ...existingRaw,
        job_fit: {
          ...existingJobFit,
          criteria_assessment: scored.criteria,
          confirmations: existingConfirmations,
          score_explanation:
            "Score recalculé après confirmation utilisateur sur un critère (formule critère × preuve).",
          match_score: scored.match_score,
        },
      },
    })
    .eq("id", job.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    job: toJobViewModel(updated),
    criteria_assessment: scored.criteria,
    match_score: scored.match_score,
  })
}
