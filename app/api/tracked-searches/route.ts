import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { trackedSearchWriteSchema } from "@/lib/jobs/tracked-search-schema";
import { buildNextSyncAt } from "@/lib/sources/utils";

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

  let payload: ReturnType<typeof trackedSearchWriteSchema.parse>;
  try {
    payload = trackedSearchWriteSchema.parse(await request.json());
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
