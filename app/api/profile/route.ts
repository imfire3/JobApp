import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const profileSchema = z.object({
  cv_text: z.string().default(""),
});

/**
 * GET /api/profile — fetch minimal CV context
 */
export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cv_contexts")
    .select("id,cv_text,updated_at,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        profile: {
          id: user.id,
          cv_text: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: created, error: createError } = await supabase
      .from("cv_contexts")
      .insert({
        id: user.id,
        cv_text: "",
      })
      .select("id,cv_text,updated_at,created_at")
      .single();

    if (createError) {
      if (createError.code === "42P01") {
        return NextResponse.json({
          profile: {
            id: user.id,
            cv_text: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    return NextResponse.json({ profile: created });
  }

  return NextResponse.json({ profile: data });
}

/** PUT /api/profile — save CV context only */
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

  const { data, error } = await supabase
    .from("cv_contexts")
    .upsert({
      id: user.id,
      cv_text: body.cv_text,
    })
    .select("id,cv_text,updated_at,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
