import { NextResponse } from "next/server"
import { getPromptTraces, clearPromptTraces } from "@/lib/ai/prompt-trace"

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 })
  }

  const traces = getPromptTraces(100)
  return NextResponse.json({ traces })
}

export async function DELETE() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 })
  }

  clearPromptTraces()
  return NextResponse.json({ ok: true })
}
