import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import {
  isSelfSignupAllowed,
  SELF_SIGNUP_CLOSED_MESSAGE,
} from "@/lib/auth/self-signup"
import { generateFakeJobs, getFakeFillJobCount } from "@/lib/dev/fake-jobs"
import { buildJobInsertPayload } from "@/lib/jobs/mapper"

/**
 * Local/dev only: insert a batch of fake job offers for the current user.
 * Closed on Vercel (same gate as self-signup).
 */
export async function POST(request: Request) {
  if (!isSelfSignupAllowed()) {
    return NextResponse.json(
      { error: SELF_SIGNUP_CLOSED_MESSAGE },
      { status: 403 }
    )
  }

  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  let count = getFakeFillJobCount()
  try {
    const body = (await request.json().catch(() => ({}))) as { count?: unknown }
    if (typeof body.count === "number" && Number.isFinite(body.count)) {
      count = Math.round(body.count)
    }
  } catch {
    // keep default
  }

  const fakeJobs = generateFakeJobs(count)
  const scrapedAt = new Date().toISOString()
  const payload = fakeJobs.map((job) =>
    buildJobInsertPayload({
      userId: user.id,
      job,
      rawData: { ...job, seeded: "local-fake-fill" },
      scrapedAt,
    })
  )

  const { data, error } = await supabase
    .from("jobs")
    .insert(payload as never)
    .select("id, title, company, url")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const jobs = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    url: row.url as string,
    was_duplicate: false,
  }))

  return NextResponse.json({
    message: "Fake jobs seeded",
    imported: jobs.length,
    jobs,
  })
}
