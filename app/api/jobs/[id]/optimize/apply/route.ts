import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { applyCvOptimizeProposals, validateCvOptimizeProposals } from "@/lib/jobs/cv-optimize-apply";
import { loadCvText, saveCvTextWithBackup } from "@/lib/cv/cv-context";

const bodySchema = z.object({
  proposal_ids: z.array(z.string().min(1)).min(1),
  edits: z
    .array(
      z.object({
        proposal_id: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id: jobId } = await params;

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, user_id, raw_data")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const loadedCv = await loadCvText(supabase, user.id);
  const currentCv = loadedCv.cvText;

  if (currentCv.length === 0) {
    return NextResponse.json(
      { error: "CV introuvable. Ajoute ton CV dans ton profil." },
      { status: 400 },
    );
  }
  const rawData = ((job as Record<string, unknown>).raw_data && typeof (job as Record<string, unknown>).raw_data === "object" && !Array.isArray((job as Record<string, unknown>).raw_data)
    ? ((job as Record<string, unknown>).raw_data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const jobFit = (rawData.job_fit && typeof rawData.job_fit === "object" && !Array.isArray(rawData.job_fit)
    ? (rawData.job_fit as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const cvOpt = (jobFit.cv_optimize && typeof jobFit.cv_optimize === "object" && !Array.isArray(jobFit.cv_optimize)
    ? (jobFit.cv_optimize as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const response = cvOpt.response;

  // Détection de conflit si CV modifié depuis génération
  const storedCvHash = (cvOpt.cv_hash as string) || null;
  if (storedCvHash) {
    const { hashCvContent } = await import("@/lib/cv-analysis/hash");
    if (hashCvContent(currentCv) !== storedCvHash) {
      return NextResponse.json(
        { error: "Ton CV a changé depuis l'analyse — relance l'optimisation.", code: "cv_changed" },
        { status: 409 },
      );
    }
  }

  const editsMap: Record<string, string> = {};
  if (Array.isArray(body.edits)) {
    for (const e of body.edits) {
      if (e.proposal_id && e.text.trim()) editsMap[e.proposal_id] = e.text.trim();
    }
  }

  const validation = validateCvOptimizeProposals(response, currentCv, editsMap);
  if (!validation.ok) {
    return NextResponse.json({ error: "Certains éléments ne peuvent pas être appliqués automatiquement.", details: validation.errors }, { status: 400 });
  }

  const allowed = new Set(validation.applicable);
  const requestedIds = Array.from(new Set(body.proposal_ids));
  const blocked = requestedIds.filter((id) => !allowed.has(id));
  if (blocked.length > 0 || allowed.size === 0) {
    return NextResponse.json(
      {
        error:
          blocked.length > 0
            ? "Certaines modifications sélectionnées ne peuvent pas être appliquées. Rien n'a été modifié."
            : "Aucune modification applicable sélectionnée.",
        blocked_ids: blocked,
      },
      { status: 400 },
    );
  }
  const toApply = requestedIds;

  const newCv = applyCvOptimizeProposals(currentCv, response, toApply, editsMap);
  if (newCv === currentCv) {
    return NextResponse.json(
      {
        error:
          "Aucune modification n'a pu être appliquée au CV actuel. Relance l'optimisation puis réessaie.",
        code: "no_change",
      },
      { status: 409 },
    );
  }

  // Sauvegarde réversible (best effort si la colonne de backup n'existe pas)
  const saveResult = await saveCvTextWithBackup(supabase, user.id, newCv, currentCv);
  if (saveResult.error) {
    return NextResponse.json(
      { error: `Impossible d'enregistrer le CV optimisé : ${saveResult.error}` },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();

  // Marquer comme appliqué dans raw_data
  const applied = Array.isArray(jobFit.cv_optimize_applied)
    ? (jobFit.cv_optimize_applied as string[])
    : [];
  const nextJobFit = {
    ...jobFit,
    cv_optimize_applied: Array.from(new Set([...applied, ...toApply])),
  };
  await supabase
    .from("jobs")
    .update({ raw_data: { ...rawData, job_fit: nextJobFit }, updated_at: now })
    .eq("id", jobId)
    .eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    cv_text: newCv,
    previous_saved: saveResult.previousSaved,
    applied_count: toApply.length,
  });
}
