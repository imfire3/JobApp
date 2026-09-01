import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { normalizeCriteria } from "@/lib/sources/utils";

const createSchema = z.object({
  name: z.string().min(2),
  enabled: z.boolean().default(true),
  criteria: z.unknown(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: queryError } = await supabase
    .from("source_searches")
    .select("*")
    .eq("source_id", sourceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  return NextResponse.json({ searches: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("source_searches")
    .insert({
      user_id: user.id,
      source_id: sourceId,
      name: payload.name,
      enabled: payload.enabled,
      criteria: normalizeCriteria(payload.criteria),
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ search: data });
}
