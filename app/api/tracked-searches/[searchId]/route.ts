import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { trackedSearchPatchSchema } from "@/lib/jobs/tracked-search-schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: ReturnType<typeof trackedSearchPatchSchema.parse>;
  try {
    payload = trackedSearchPatchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("tracked_searches")
    .update(payload)
    .eq("id", searchId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ tracked_search: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { error: deleteError } = await supabase
    .from("tracked_searches")
    .delete()
    .eq("id", searchId)
    .eq("user_id", user.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
