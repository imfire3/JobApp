import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  CoverLetterError,
  generateCoverLetterBatch,
} from "@/lib/cover-letters/service";

const MAX_BATCH_SIZE = 10;

const bodySchema = z.object({
  jobIds: z.array(z.string().uuid()).min(1).max(MAX_BATCH_SIZE),
});

/**
 * POST /api/generate-cover-letter/batch
 * Generate cover letters for up to 10 selected jobs.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: `Invalid request body. Provide 1-${MAX_BATCH_SIZE} jobIds.` },
      { status: 400 }
    );
  }

  const cvCheck = await supabase
    .from("cv_contexts")
    .select("cv_text")
    .eq("id", user.id)
    .maybeSingle();

  if (!cvCheck.data?.cv_text?.trim()) {
    return NextResponse.json(
      { error: "Please add your CV text in CV Context before generating cover letters" },
      { status: 400 }
    );
  }

  try {
    const result = await generateCoverLetterBatch(supabase, user.id, body.jobIds);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CoverLetterError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Batch generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
