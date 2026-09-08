import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { demoRequestSchema } from "@/lib/demo-request/schema"
import { sendDemoRequestEmail } from "@/lib/demo-request/notify"
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  let input
  try {
    input = demoRequestSchema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0]?.message
      return NextResponse.json(
        { error: first ?? "Prénom, nom et email requis" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Prénom, nom et email requis" },
      { status: 400 }
    )
  }

  // Honeypot filled → pretend success (spam bots)
  if (input.website) {
    return NextResponse.json({ ok: true })
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Configuration serveur incomplète (SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    )
  }

  try {
    const supabase = createServiceClient()
    const { error: insertError } = await supabase.from("demo_requests").insert({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      message: input.message ?? null,
    })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Impossible d’enregistrer la demande" },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer la demande",
      },
      { status: 500 }
    )
  }

  try {
    await sendDemoRequestEmail({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      message: input.message,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Demande enregistrée, mais l’email a échoué : ${error.message}`
            : "Demande enregistrée, mais l’email a échoué",
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
