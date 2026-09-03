import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { ONBOARDING_COOKIE, getOnboardingCookieOptions } from "@/lib/onboarding/cookie";
import {
  canCompleteOnboarding,
  deriveOnboardingStep,
  shouldAutoComplete,
  type OnboardingFlags,
} from "@/lib/onboarding/status";
import { MIN_CV_LENGTH } from "@/lib/cv-analysis/service";

const bodySchema = z.object({
  completed: z.literal(true),
});

type LoadedOnboardingState = OnboardingFlags;

async function loadOnboardingState(
  supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"],
  userId: string
): Promise<LoadedOnboardingState> {
  const [
    { data: cvContext, error: cvContextError },
    { data: profile, error: profileError },
    { data: latestAnalysis, error: latestAnalysisError },
    { count: trackedSearchCount, error: trackedSearchError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase.from("cv_contexts").select("cv_text").eq("id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("target_roles,target_locations")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("cv_analyses")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tracked_searches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_settings")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  for (const error of [cvContextError, profileError, latestAnalysisError, trackedSearchError, settingsError]) {
    if (error && error.code !== "42P01" && error.code !== "42703") {
      throw new Error(error.message);
    }
  }

  const hasCv = (cvContext?.cv_text?.trim().length ?? 0) >= MIN_CV_LENGTH;
  const targetRoles = Array.isArray(profile?.target_roles) ? profile.target_roles : [];
  const targetLocations = Array.isArray(profile?.target_locations) ? profile.target_locations : [];
  const hasTargets = targetRoles.length > 0 && targetLocations.length > 0;
  const hasAnalysis = Boolean(latestAnalysis);
  const hasTrackedSearch = (trackedSearchCount ?? 0) > 0;
  const completed = settings?.onboarding_completed === true;

  return {
    hasCv,
    hasTargets,
    hasAnalysis,
    hasTrackedSearch,
    completed,
  };
}

function buildOnboardingResponse(flags: LoadedOnboardingState) {
  return {
    completed: flags.completed,
    step: deriveOnboardingStep(flags),
    has_cv: flags.hasCv,
    has_targets: flags.hasTargets,
    has_analysis: flags.hasAnalysis,
    has_tracked_search: flags.hasTrackedSearch,
  };
}

function createOnboardingResponse(flags: LoadedOnboardingState) {
  const response = NextResponse.json(buildOnboardingResponse(flags));
  response.cookies.set(
    ONBOARDING_COOKIE,
    flags.completed ? "done" : "pending",
    getOnboardingCookieOptions()
  );
  return response;
}

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const flags = await loadOnboardingState(supabase, user.id);

    if (!flags.completed && shouldAutoComplete(flags)) {
      const completedAt = new Date().toISOString();
      const { error: updateError } = await supabase.from("user_settings").upsert(
        {
          id: user.id,
          onboarding_completed: true,
          onboarding_completed_at: completedAt,
        },
        { onConflict: "id" }
      );

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return createOnboardingResponse({
        ...flags,
        completed: true,
      });
    }

    return createOnboardingResponse(flags);
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Failed to load onboarding state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const flags = await loadOnboardingState(supabase, user.id);
    if (!body.completed || !canCompleteOnboarding(flags)) {
      return NextResponse.json({ error: "Onboarding cannot be completed yet" }, { status: 400 });
    }

    const { error: updateError } = await supabase.from("user_settings").upsert(
      {
        id: user.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const response = NextResponse.json({
      completed: true,
      step: "done" as const,
    });
    response.cookies.set(ONBOARDING_COOKIE, "done", getOnboardingCookieOptions());
    return response;
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Failed to update onboarding state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
