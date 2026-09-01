import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { normalizeCriteria } from "@/lib/sources/utils";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  enabled: z.boolean().optional(),
  criteria: z.unknown().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.enabled !== undefined) updates.enabled = payload.enabled;
  if (payload.criteria !== undefined) updates.criteria = normalizeCriteria(payload.criteria);

  const { data, error: updateError } = await supabase
    .from("source_searches")
    .update(updates)
    .eq("id", searchId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ search: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { error: deleteError } = await supabase
    .from("source_searches")
    .delete()
    .eq("id", searchId)
    .eq("user_id", user.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
