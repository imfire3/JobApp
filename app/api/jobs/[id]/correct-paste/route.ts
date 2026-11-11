import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import { randomBytes } from "node:crypto"
import { extractWebsitePasteWithAI } from "@/lib/openai/client"
import { parseWebsitePaste, websitePasteRequestSchema } from "@/lib/imports/website-paste"
import { buildPasteCorrection, readPasteCorrection, signPasteCorrection } from "@/lib/imports/paste-correction"
import { toJobViewModel } from "@/lib/jobs/mapper"

const bodySchema = z.union([
  websitePasteRequestSchema,
  z.strictObject({ confirm: z.literal(true), token: z.string().min(1).max(1_200_000) }),
])
// No publicly known local-auth fallback for authorization of correction tickets.
// A server restart simply expires pending previews when no AUTH_SECRET is set.
const correctionSecret = process.env.AUTH_SECRET || randomBytes(32).toString("hex")

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, error, unreachable } = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })
  if (unreachable) return NextResponse.json({ error }, { status: 503 })
  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Collage ou validation invalide." }, { status: 400 })
  const { data: job, error: loadError } = await supabase.from("jobs").select("*")
    .eq("id", id).eq("user_id", user.id).maybeSingle()
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  if (!job) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 })

  if (!("confirm" in parsed.data)) {
    try {
      const row = await parseWebsitePaste(parsed.data, extractWebsitePasteWithAI)
      if (!row) return NextResponse.json({ error: "Titre introuvable ou ambigu. Colle uniquement le titre et l’annonce concernée." }, { status: 422 })
      const fields = buildPasteCorrection(row, user.id)
      const token = signPasteCorrection({ userId: user.id, jobId: id,
        updatedAt: job.updated_at, expires: Date.now() + 10 * 60_000,
        fields, source: row.raw_data ?? {} }, correctionSecret)
      return NextResponse.json({ proposal: fields, token })
    } catch {
      return NextResponse.json({ error: "Impossible d’extraire l’offre. Précise le collage et réessaie." }, { status: 422 })
    }
  }

  const ticket = readPasteCorrection(parsed.data.token, correctionSecret)
  if (!ticket || ticket.userId !== user.id || ticket.jobId !== id)
    return NextResponse.json({ error: "Aperçu invalide ou expiré. Prépare un nouvel aperçu." }, { status: 400 })
  if (ticket.updatedAt !== job.updated_at)
    return NextResponse.json({ error: "L’offre a changé. Prépare un nouvel aperçu." }, { status: 409 })
  const raw = job.raw_data && typeof job.raw_data === "object" && !Array.isArray(job.raw_data) ? job.raw_data : {}
  const fit = raw.job_fit && typeof raw.job_fit === "object" && !Array.isArray(raw.job_fit) ? raw.job_fit : {}
  const { data: updated, error: updateError } = await supabase.from("jobs").update({
    ...ticket.fields,
    raw_data: { ...raw, ...ticket.source,
      job_fit: { ...fit, offer_corrected_at: new Date().toISOString() } },
  }).eq("id", id).eq("user_id", user.id).eq("updated_at", ticket.updatedAt).select().maybeSingle()
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: "L’offre a changé. Prépare un nouvel aperçu." }, { status: 409 })
  return NextResponse.json({ job: toJobViewModel(updated), message: "Offre corrigée. Actualise son analyse." })
}
