/**
 * When a job is marked applied, ensure a linked CRM application exists.
 * Idempotent: update existing row for (user_id, job_id) or insert.
 */

export type JobRowForApplication = {
  id: string
  title: string | null
  company: string | null
}

// Minimal Supabase client surface used by this helper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApplicationsClient = { from: (table: string) => any }

export async function upsertApplicationsFromAppliedJobs(
  supabase: ApplicationsClient,
  userId: string,
  jobs: JobRowForApplication[]
): Promise<{ error: string | null }> {
  if (jobs.length === 0) return { error: null }

  const today = new Date().toISOString().slice(0, 10)

  for (const job of jobs) {
    const company = (job.company ?? "").trim() || "Entreprise"
    const position = (job.title ?? "").trim() || "Poste"

    const { data: existing, error: existingError } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", job.id)
      .maybeSingle()

    if (existingError) {
      return { error: existingError.message }
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("applications")
        .update({
          company,
          position,
          status: "applied",
          date_applied: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
      if (error) return { error: error.message }
      continue
    }

    const { error } = await supabase.from("applications").insert({
      user_id: userId,
      job_id: job.id,
      company,
      position,
      status: "applied",
      date_applied: today,
      history: [
        {
          at: new Date().toISOString(),
          status: "applied",
          note: "Créé depuis le statut Candidaté de l’offre",
        },
      ],
    })
    if (error) return { error: error.message }
  }

  return { error: null }
}
