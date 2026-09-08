import { Resend } from "resend"
import type { DemoRequestInput } from "@/lib/demo-request/schema"

export const DEFAULT_DEMO_NOTIFY_EMAIL = "vincentgiacalonepro@gmail.com"
export const DEFAULT_RESEND_FROM_EMAIL = "JobTracker <beth.t@example.com>"

export type SendDemoRequestEmailDeps = {
  send: (payload: {
    from: string
    to: string
    subject: string
    text: string
  }) => Promise<{ id?: string }>
  notifyEmail?: string
  fromEmail?: string
}

export function buildDemoRequestEmail(input: DemoRequestInput) {
  const subject = `Demande démo JobTracker — ${input.first_name} ${input.last_name}`
  const lines = [
    "Nouvelle demande d’accès démo JobTracker.",
    "",
    `Prénom : ${input.first_name}`,
    `Nom : ${input.last_name}`,
    `Email : ${input.email}`,
  ]
  if (input.message) {
    lines.push("", "Message :", input.message)
  }
  lines.push("", "Ouvre un accès depuis Paramètres → Créer un accès.")
  return { subject, text: lines.join("\n") }
}

export async function sendDemoRequestEmail(
  input: DemoRequestInput,
  deps?: SendDemoRequestEmailDeps
) {
  const notifyEmail =
    deps?.notifyEmail?.trim() ||
    process.env.DEMO_NOTIFY_EMAIL?.trim() ||
    DEFAULT_DEMO_NOTIFY_EMAIL
  const fromEmail =
    deps?.fromEmail?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    DEFAULT_RESEND_FROM_EMAIL

  const { subject, text } = buildDemoRequestEmail(input)

  if (deps?.send) {
    return deps.send({ from: fromEmail, to: notifyEmail, subject, text })
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY")
  }

  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: fromEmail,
    to: notifyEmail,
    subject,
    text,
  })

  if (result.error) {
    throw new Error(result.error.message || "Resend email failed")
  }

  return { id: result.data?.id }
}
