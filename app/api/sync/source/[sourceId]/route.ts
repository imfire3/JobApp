import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { isApiIngestionSource } from "@/lib/sources/constants";
import { syncFranceTravailSource } from "@/lib/sources/france-travail-sync";
import { runTrackedSyncForTarget } from "@/lib/sync/tracked-search-sync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data: source, error: sourceError } = await supabase
    .from("job_sources")
    .select("id,slug")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sourceError || !source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (source.slug === "france-travail") {
    const result = await syncFranceTravailSource(supabase, user.id, source.id);
    if (result.error && result.imported === 0 && result.found === 0) {
      const status = /non configurée/i.test(result.error) ? 503 : 500;
      return NextResponse.json(
        { error: result.error, imported: 0, skipped: 0, found: 0 },
        { status }
      );
    }
    return NextResponse.json({
      message: "France Travail sync finished",
      imported: result.imported,
      skipped: result.skipped,
      found: result.found,
      jobIds: result.jobIds,
      error: result.error ?? null,
    });
  }

  if (!isApiIngestionSource(source.slug)) {
    return NextResponse.json(
      {
        error:
          "Cette source n’a pas de sync serveur. Utilise l’extension Chrome ou Imports (URL / collage / CSV).",
      },
      { status: 400 }
    );
  }

  // Legacy path for any future API sources wired to tracked searches
  const result = await runTrackedSyncForTarget(supabase, user.id, { sourceId });
  return NextResponse.json({ message: "Source sync finished", ...result });
}
