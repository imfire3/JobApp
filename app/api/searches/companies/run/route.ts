import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { runCompanySearch } from "@/lib/jobs/company-prospecting";
import { COMPANY_CONNECTOR_VERSION } from "@/lib/connectors/companies";
import type { Company } from "@/types";

const criteriaSchema = z.object({
  roles: z.array(z.string()),
  sectors: z.array(z.string()),
  locations: z.array(z.string()),
  size_min: z.number().int().nullable(),
  size_max: z.number().int().nullable(),
  remote: z.boolean(),
  priority: z.string().optional(),
  summary_fr: z.string(),
});

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof criteriaSchema>;
  try {
    payload = criteriaSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: search, error: createError } = await supabase
    .from("company_searches")
    .insert({
      user_id: user.id,
      query: payload.summary_fr,
      criteria: payload,
      status: "pending",
      results_found: 0,
      companies_added: 0,
      raw: [],
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json(
      { error: `Failed to create search: ${createError.message}` },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await runCompanySearch({
          supabase,
          userId: user.id,
          searchId: search.id,
          criteria: payload,
          onCompany: (company: Company, index: number, total: number) => {
            send("company", { company, index, total });
          },
          onStep: (step: string) => {
            send("step", { step });
          },
        });

        send("done", {
          search: result.search,
          provider: result.provider,
          connectorVersion: COMPANY_CONNECTOR_VERSION,
          total: result.companies.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Company search failed";
        await supabase
          .from("company_searches")
          .update({ status: "error", error_message: message })
          .eq("id", search.id)
          .eq("user_id", user.id);
        send("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
