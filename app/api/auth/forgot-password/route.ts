import { NextResponse } from "next/server"
import { z } from "zod"
import { isSignupOpen } from "@/lib/auth/self-signup"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

const schema = z.object({
  email: z.email(),
})

const GENERIC_MESSAGE =
  "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé."

/**
 * Sends a Supabase password-recovery e-mail. The link returns through
 * /auth/callback and opens /login/reset?mode=update.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json(
      {
        error:
          "La récupération par e-mail est réservée à la version hébergée. Utilise le compte local ou demande un accès.",
      },
      { status: 400 }
    )
  }

  if (!isSignupOpen()) {
    return NextResponse.json(
      { error: "La récupération de mot de passe est fermée." },
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
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(body.email.trim(), {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
      "/login/reset?mode=update"
    )}`,
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

  // Always answer the same way to avoid leaking whether an account exists.
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })
}
