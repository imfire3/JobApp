import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { generateOutreachForCompany } from "@/lib/jobs/company-prospecting";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;

  const { data, error: queryError } = await supabase
    .from("outreach_messages")
    .select("*")
    .eq("company_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;

  try {
    const messages = await generateOutreachForCompany({
      supabase,
      userId: user.id,
      companyId: id,
    });
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Outreach generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}