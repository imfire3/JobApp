import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications_enabled: z.boolean().optional(),
  timezone: z.string().optional(),
  default_language: z.string().optional(),
  ai_provider: z.enum(["openai", "anthropic", "gemini"]).optional(),
  openai_key: z.string().nullable().optional(),
  anthropic_key: z.string().nullable().optional(),
  gemini_key: z.string().nullable().optional(),
  resume_defaults: z.record(z.string(), z.unknown()).optional(),
  cover_letter_defaults: z.record(z.string(), z.unknown()).optional(),
  automation_defaults: z.record(z.string(), z.unknown()).optional(),
  cv_analysis_system_prompt: z.string().max(20_000).nullable().optional(),
});

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: queryError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (queryError) {
    if (queryError.code === "42P01") {
      return NextResponse.json({ settings: { theme: "dark" } });
    }
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (data) return NextResponse.json({ settings: data });

  const { data: created, error: createError } = await supabase
    .from("user_settings")
    .insert({ id: user.id })
    .select("*")
    .single();
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });
  return NextResponse.json({ settings: created });
}

export async function PUT(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof settingsSchema>;
  try {
    payload = settingsSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("user_settings")
    .upsert({
      id: user.id,
      ...payload,
    })
    .select("*")
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}
