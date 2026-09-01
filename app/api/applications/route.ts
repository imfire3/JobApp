import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { APPLICATION_STATUSES } from "@/types";

const createSchema = z.object({
  job_id: z.string().uuid().nullable().optional(),
  company: z.string().min(1),
  position: z.string().min(1),
  date_applied: z.string().nullable().optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  interview_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  generated_cover_letter: z.string().nullable().optional(),
  generated_resume: z.string().nullable().optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
  history_note: z.string().optional(),
});

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: queryError } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const history = [
    {
      at: new Date().toISOString(),
      status: payload.status ?? "to_apply",
      note: "Application created",
    },
  ];

  const { data, error: insertError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      ...payload,
      status: payload.status ?? "to_apply",
      history,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ application: data });
}

export async function PATCH(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("history,status")
    .eq("id", payload.id)
    .eq("user_id", user.id)
    .single();

  const history = Array.isArray(existing?.history) ? existing.history : [];
  if (payload.status && payload.status !== existing?.status) {
    history.push({
      at: new Date().toISOString(),
      status: payload.status,
      note: payload.history_note ?? `Status changed to ${payload.status}`,
    });
  }

  const { id, history_note, ...updates } = payload;
  const { data, error: updateError } = await supabase
    .from("applications")
    .update({
      ...updates,
      history,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
