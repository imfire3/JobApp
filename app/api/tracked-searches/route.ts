import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { buildNextSyncAt } from "@/lib/sources/utils";

const trackedSearchSchema = z.object({
  name: z.string().min(2),
  enabled: z.boolean().default(true),
  job_titles: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  excluded_keywords: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  maximum_distance: z.number().nullable().optional(),
  remote_preference: z.string().default("any"),
  hybrid: z.boolean().default(false),
  on_site: z.boolean().default(false),
  experience: z.array(z.string()).default([]),
  contract_types: z.array(z.string()).default([]),
  minimum_salary: z.number().nullable().optional(),
  currency: z.string().default("EUR"),
  industries: z.array(z.string()).default([]),
  excluded_industries: z.array(z.string()).default([]),
  company_size: z.string().nullable().optional(),
  company_culture: z.string().nullable().optional(),
  ai_preferences: z.record(z.string(), z.unknown()).default({}),
  minimum_match_score: z.number().nullable().optional(),
});

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: queryError } = await supabase
    .from("tracked_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (queryError) {
    if (queryError.code === "42P01") {
      return NextResponse.json({ tracked_searches: [] });
    }
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({ tracked_searches: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof trackedSearchSchema>;
  try {
    payload = trackedSearchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("tracked_searches")
    .insert({
      user_id: user.id,
      ...payload,
      next_run: buildNextSyncAt("08:00"),
    })
    .select("*")
    .single();
  if (insertError) {
    if (insertError.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Database is missing tracked_searches table. Run the latest Supabase migrations, then retry.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ tracked_search: data });
}
