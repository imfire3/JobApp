import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCompanySearchIntent } from "@/lib/ai/company-ai";
import { getAuthenticatedUser } from "@/lib/auth";

const parseSchema = z.object({
  query: z.string().min(3),
});

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof parseSchema>;
  try {
    payload = parseSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const { criteria, promptVersion } = await generateCompanySearchIntent(payload.query);
    return NextResponse.json({ criteria, promptVersion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search intent generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}