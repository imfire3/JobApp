import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  CoverLetterError,
  generateAndSaveCoverLetter,
} from "@/lib/cover-letters/service";

const bodySchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * POST /api/generate-cover-letter
 * Generate one personalized cover letter via OpenAI (server-side only).
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await generateAndSaveCoverLetter(supabase, user.id, body.jobId);
    return NextResponse.json({
      cover_letter: result.content,
      coverLetterId: result.coverLetterId,
      job: result.job,
    });
  } catch (error) {
    if (error instanceof CoverLetterError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
