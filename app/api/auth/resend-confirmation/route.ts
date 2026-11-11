import { NextResponse } from "next/server"
import { z } from "zod"
import {
  isHostedSignupEnabled,
  isSelfSignupAllowed,
} from "@/lib/auth/self-signup"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

const schema = z.object({
  email: z.email(),
})

const GENERIC_MESSAGE =
  "Si un compte attend une confirmation pour cette adresse, un nouvel e-mail vient d’être envoyé."

/**
 * Resends the Supabase address-confirmation e-mail.
 * Must stay behind the same configuration as hosted signup.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json(
      {
        error:
          "La confirmation par e-mail est désactivée en local : la connexion est immédiate.",
      },
      { status: 400 }
    )
  }

  if (!isHostedSignupEnabled() && !isSelfSignupAllowed()) {
    return NextResponse.json(
      { error: "L’inscription hébergée n’est pas ouverte." },
      { status: 403 }
    )
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Configuration Supabase incomplète (URL et clé anon)." },
      { status: 503 }
    )
  }

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Adresse e-mail invalide" }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const next = encodeURIComponent("/login?cv=1&confirmed=1")
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: body.email.trim(),
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${next}`,
    },
  })

  if (error) {
    const limited = error.status === 429
    return NextResponse.json(
      {
        error: limited
          ? "Trop de demandes. Réessaie dans quelques minutes."
          : "Envoi impossible pour le moment.",
      },
      { status: limited ? 429 : 400 }
    )
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })
}
