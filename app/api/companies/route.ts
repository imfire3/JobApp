import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const searchId = new URL(request.url).searchParams.get("search_id");
  let query = supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .order("opportunity_score", { ascending: false, nullsFirst: false });

  if (searchId) query = query.eq("search_id", searchId);

  const { data, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ companies: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("companies")
    .insert({ ...payload, user_id: user.id })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ company: data });
}