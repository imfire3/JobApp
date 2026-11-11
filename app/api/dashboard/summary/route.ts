import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { MIN_CV_LENGTH } from "@/lib/cv-analysis/service";
import { mapJobRows } from "@/lib/jobs/mapper";
import type { DashboardApplication } from "@/lib/dashboard/overview";

const APPLICATION_COLUMNS =
  "id,company,position,status,date_applied,interview_date,updated_at";

function emptySummary() {
  return {
    jobs: [],
    applications: [] as DashboardApplication[],
    first_name: null,
    profile: {
      hasCv: false,
      hasProfileReviewed: false,
      hasTargets: false,
    },
  };
}

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const [jobsResult, applicationsResult, profileResult, cvResult] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("published_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("applications")
        .select(APPLICATION_COLUMNS)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("first_name,target_roles,target_locations,profile_reviewed_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("cv_contexts")
        .select("cv_text")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (jobsResult.error) {
    if (jobsResult.error.code === "42P01") {
      return NextResponse.json(emptySummary());
    }
    return NextResponse.json({ error: jobsResult.error.message }, { status: 500 });
  }

  const ignoredCodes = new Set(["42P01", "42703"]);
  if (applicationsResult.error && !ignoredCodes.has(applicationsResult.error.code ?? "")) {
    return NextResponse.json(
      { error: applicationsResult.error.message },
      { status: 500 }
    );
  }
  if (profileResult.error && !ignoredCodes.has(profileResult.error.code ?? "")) {
    return NextResponse.json(
      { error: profileResult.error.message },
      { status: 500 }
    );
  }
  if (cvResult.error && !ignoredCodes.has(cvResult.error.code ?? "")) {
    return NextResponse.json({ error: cvResult.error.message }, { status: 500 });
  }

  const profileRow = profileResult.error ? null : profileResult.data;
  const cvText = cvResult.error ? "" : (cvResult.data?.cv_text ?? "");
  const targetRoles = Array.isArray(profileRow?.target_roles)
    ? profileRow.target_roles
    : [];
  const targetLocations = Array.isArray(profileRow?.target_locations)
    ? profileRow.target_locations
    : [];

  return NextResponse.json({
    jobs: mapJobRows(jobsResult.data ?? []),
    applications: (applicationsResult.error
      ? []
      : (applicationsResult.data ?? [])) as DashboardApplication[],
    first_name:
      typeof profileRow?.first_name === "string" ? profileRow.first_name : null,
    profile: {
      hasCv: cvText.trim().length >= MIN_CV_LENGTH,
      hasProfileReviewed:
        typeof profileRow?.profile_reviewed_at === "string" &&
        profileRow.profile_reviewed_at.length > 0,
      hasTargets: targetRoles.length > 0 && targetLocations.length > 0,
    },
  });
}
