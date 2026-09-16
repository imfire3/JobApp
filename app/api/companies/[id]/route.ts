import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { COMPANY_PIPELINE_STATUSES } from "@/types";

const updateSchema = z.object({
  status: z.enum(COMPANY_PIPELINE_STATUSES).optional(),
  notes: z.string().nullable().optional(),
  next_action_at: z.string().nullable().optional(),
  outcome_reason: z.string().nullable().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*, contacts:company_contacts(*), outreach_messages:outreach_messages(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (companyError) {
    return NextResponse.json(
      { error: companyError.code === "PGRST116" ? "Company not found" : companyError.message },
      { status: companyError.code === "PGRST116" ? 404 : 500 }
    );
  }
  return NextResponse.json({ company });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id } = await context.params;

  const { data, error: updateError } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ company: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;

  const { error: deleteError } = await supabase
    .from("companies")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}