import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import { toJobViewModel } from "@/lib/jobs/mapper"
import type {
  JobCriterionAssessment,
  JobCriterionConfirmation,
} from "@/types"

const bodySchema = z.object({
  jobId: z.string().uuid(),
  criterionId: z.string().min(1),
  answer: z.enum(["yes", "no", "unknown"]),
  detail: z.string().max(4000).optional().nullable(),
})

/**
 * POST /api/analyze-job/answer
 *
 * Stores the candidate's answer on an offer criterion without touching evidence
 * or recomputing the score. Candidate declarations are never CV quotes.
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

  const detail = body.detail?.trim() ?? ""
  if (body.answer === "yes" && !detail) {
    return NextResponse.json(
      { error: "Ajoute un exemple pour préciser cette expérience." },
      { status: 400 }
    )
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, user_id, raw_data")
    .eq("id", body.jobId)
    .eq("user_id", user.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const rawData =
    job.raw_data &&
    typeof job.raw_data === "object" &&
    !Array.isArray(job.raw_data)
      ? (job.raw_data as Record<string, unknown>)
      : {}
  const jobFit =
    rawData.job_fit &&
    typeof rawData.job_fit === "object" &&
    !Array.isArray(rawData.job_fit)
      ? (rawData.job_fit as Record<string, unknown>)
      : {}

  const criteria = Array.isArray(jobFit.criteria_assessment)
    ? (jobFit.criteria_assessment as JobCriterionAssessment[])
    : []
  if (criteria.length === 0) {
    return NextResponse.json(
      {
        error:
          "Aucun critère à préciser pour cette offre. Relance l’analyse d’abord.",
      },
      { status: 400 }
    )
  }

  const target = criteria.find((item) => item.id === body.criterionId)
  if (!target) {
    return NextResponse.json({ error: "Critère introuvable" }, { status: 404 })
  }

  const confirmation: JobCriterionConfirmation = {
    criterion_id: body.criterionId,
    answer: body.answer,
    detail: detail || null,
    updated_at: new Date().toISOString(),
  }

  const existingConfirmations = Array.isArray(jobFit.confirmations)
    ? (jobFit.confirmations as JobCriterionConfirmation[]).filter(
        (item) => item.criterion_id !== body.criterionId
      )
    : []
  existingConfirmations.push(confirmation)

  const { data: updated, error: updateError } = await supabase
    .from("jobs")
    .update({
      raw_data: {
        ...rawData,
        job_fit: {
          ...jobFit,
          confirmations: existingConfirmations,
        },
      },
    })
    .eq("id", job.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    job: toJobViewModel(updated),
    confirmation,
  })
}
