import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import { LOCAL_ADMIN_ID, registerLocalUser } from "@/lib/local-auth"
import { ensureLocalAuthUserInSupabase } from "@/lib/supabase/ensure-local-user"
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/admin"

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir un caractère spécial")

const createUserSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: passwordSchema,
})

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (!user || authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.id !== LOCAL_ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: z.infer<typeof createUserSchema>
  try {
    body = createUserSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0]?.message
      return NextResponse.json(
        {
          error:
            first ??
            "Prénom, nom, email et mot de passe (8+ caractères, 1 majuscule, 1 spécial) requis",
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        error:
          "Prénom, nom, email et mot de passe (8+ caractères, 1 majuscule, 1 spécial) requis",
      },
      { status: 400 }
    )
  }

  const result = registerLocalUser(body.email, body.password)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  // Do not set a session cookie — admin stays logged in.
  await ensureLocalAuthUserInSupabase(result.user)

  if (hasServiceRoleKey()) {
    const supabase = createServiceClient()
    await supabase.from("profiles").upsert(
      {
        id: result.user.id,
        first_name: body.first_name,
        last_name: body.last_name,
      },
      { onConflict: "id" }
    )
  }

  return NextResponse.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      first_name: body.first_name,
      last_name: body.last_name,
    },
  })
}
