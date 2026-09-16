import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;

  const { data, error: queryError } = await supabase
    .from("company_contacts")
    .select("*")
    .eq("company_id", id)
    .eq("user_id", user.id)
    .order("relevance_score", { ascending: false });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}