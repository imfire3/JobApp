import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { loadCvText, saveCvTextWithBackup } from "@/lib/cv/cv-context";

export async function POST() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const loaded = await loadCvText(supabase, user.id);

  if (!loaded.previousAvailable) {
    return NextResponse.json(
      {
        error:
          "La sauvegarde du CV précédent n'est pas disponible sur cet environnement (migration 030 à appliquer).",
      },
      { status: 400 },
    );
  }

  if (!loaded.cvTextPrevious) {
    return NextResponse.json({ error: "Aucune version précédente disponible." }, { status: 400 });
  }

  const restored = loaded.cvTextPrevious;
  const result = await saveCvTextWithBackup(
    supabase,
    user.id,
    restored,
    loaded.cvText || null,
  );

  if (result.error) {
    return NextResponse.json(
      { error: `Restauration impossible : ${result.error}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, cv_text: restored });
}
