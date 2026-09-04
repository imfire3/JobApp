import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const profileSchema = z.object({
  cv_text: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
  target_locations: z.array(z.string()).optional(),
});

/**
 * GET /api/profile — CV context + target roles/locations
 */
export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const [{ data: cvData, error: cvError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      supabase
        .from("cv_contexts")
        .select("id,cv_text,updated_at,created_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("target_roles,target_locations")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (cvError && cvError.code !== "42P01") {
    return NextResponse.json({ error: cvError.message }, { status: 500 });
  }
  if (profileError && profileError.code !== "42P01" && profileError.code !== "42703") {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let cv = cvData;
  if (!cv && (!cvError || cvError.code !== "42P01")) {
    const { data: created, error: createError } = await supabase
      .from("cv_contexts")
      .insert({ id: user.id, cv_text: "" })
      .select("id,cv_text,updated_at,created_at")
      .single();

    if (createError && createError.code !== "42P01") {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    cv = created ?? null;
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      cv_text: cv?.cv_text ?? "",
      created_at: cv?.created_at ?? new Date().toISOString(),
      updated_at: cv?.updated_at ?? new Date().toISOString(),
      target_roles: Array.isArray(profileRow?.target_roles) ? profileRow.target_roles : [],
      target_locations: Array.isArray(profileRow?.target_locations)
        ? profileRow.target_locations
        : [],
    },
  });
}

/** PUT /api/profile — save CV and/or targets */
export async function PUT(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof profileSchema>;
  try {
    body = profileSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let cvProfile: {
    id: string;
    cv_text: string;
    updated_at: string;
    created_at: string;
  } | null = null;

  if (body.cv_text !== undefined) {
    const { data, error } = await supabase
      .from("cv_contexts")
      .upsert(
        {
          id: user.id,
          cv_text: body.cv_text,
        },
        { onConflict: "id" }
      )
      .select("id,cv_text,updated_at,created_at")
      .single();

    if (error) {
      const hint = /cv_contexts_id_fkey|foreign key/i.test(error.message)
        ? " Local admin missing in auth.users — re-login or run supabase/bootstrap_local_admin.sql."
        : "";
      return NextResponse.json({ error: `${error.message}${hint}` }, { status: 500 });
    }
    cvProfile = data;
  } else {
    const { data } = await supabase
      .from("cv_contexts")
      .select("id,cv_text,updated_at,created_at")
      .eq("id", user.id)
      .maybeSingle();
    cvProfile = data;
  }

  let targetRoles: string[] = [];
  let targetLocations: string[] = [];

  if (body.target_roles !== undefined || body.target_locations !== undefined) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("target_roles,target_locations")
      .eq("id", user.id)
      .maybeSingle();

    targetRoles =
      body.target_roles ??
      (Array.isArray(existing?.target_roles) ? existing.target_roles : []);
    targetLocations =
      body.target_locations ??
      (Array.isArray(existing?.target_locations) ? existing.target_locations : []);

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        target_roles: targetRoles,
        target_locations: targetLocations,
      },
      { onConflict: "id" }
    );

    if (profileError && profileError.code !== "42P01") {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  } else {
    const { data: existing } = await supabase
      .from("profiles")
      .select("target_roles,target_locations")
      .eq("id", user.id)
      .maybeSingle();
    targetRoles = Array.isArray(existing?.target_roles) ? existing.target_roles : [];
    targetLocations = Array.isArray(existing?.target_locations)
      ? existing.target_locations
      : [];
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      cv_text: cvProfile?.cv_text ?? body.cv_text ?? "",
      created_at: cvProfile?.created_at ?? new Date().toISOString(),
      updated_at: cvProfile?.updated_at ?? new Date().toISOString(),
      target_roles: targetRoles,
      target_locations: targetLocations,
    },
  });
}
