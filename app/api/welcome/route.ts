import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  const { data, error: queryError } = await supabase
    .from("user_settings")
    .select("product_welcome_completed, product_welcome_completed_at")
    .eq("id", user.id)
    .maybeSingle()

  if (queryError) {
    // Column missing or table missing — fall back to client localStorage
    if (queryError.code === "42P01" || queryError.code === "42703") {
      return NextResponse.json({
        completed: false,
        unsupported: true,
      })
    }
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    completed: Boolean(data?.product_welcome_completed),
    completed_at: data?.product_welcome_completed_at ?? null,
  })
}

export async function POST() {
  const { supabase, user, error } = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  const completedAt = new Date().toISOString()

  const { data, error: updateError } = await supabase
    .from("user_settings")
    .upsert({
      id: user.id,
      product_welcome_completed: true,
      product_welcome_completed_at: completedAt,
    })
    .select("product_welcome_completed, product_welcome_completed_at")
    .single()

  if (updateError) {
    if (updateError.code === "42P01" || updateError.code === "42703") {
      return NextResponse.json({
        completed: true,
        unsupported: true,
      })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    completed: Boolean(data?.product_welcome_completed),
    completed_at: data?.product_welcome_completed_at ?? completedAt,
  })
}
