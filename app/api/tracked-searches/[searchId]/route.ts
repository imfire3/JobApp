import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  enabled: z.boolean().optional(),
  job_titles: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  excluded_keywords: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  maximum_distance: z.number().nullable().optional(),
  remote_preference: z.string().optional(),
  hybrid: z.boolean().optional(),
  on_site: z.boolean().optional(),
  experience: z.array(z.string()).optional(),
  contract_types: z.array(z.string()).optional(),
  minimum_salary: z.number().nullable().optional(),
  currency: z.string().optional(),
  industries: z.array(z.string()).optional(),
  excluded_industries: z.array(z.string()).optional(),
  company_size: z.string().nullable().optional(),
  company_culture: z.string().nullable().optional(),
  ai_preferences: z.record(z.string(), z.unknown()).optional(),
  minimum_match_score: z.number().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof patchSchema>;
  try {
    payload = patchSchema.parse(await request.json());
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
