import type { DemoRequestInput } from "@/lib/demo-request/schema"

export const DEFAULT_DEMO_NOTIFY_EMAIL = "vincentgiacalonepro@gmail.com"

export type FormSubmitPayload = {
  _subject: string
  _template: "table"
  _captcha: "false"
  first_name: string
  last_name: string
  email: string
  message?: string
}

export type SendDemoRequestEmailDeps = {
  fetch?: typeof fetch
  notifyEmail?: string
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

export function buildFormSubmitPayload(input: DemoRequestInput): FormSubmitPayload {
  const { subject } = buildDemoRequestEmail(input)
  return {
    _subject: subject,
    _template: "table",
    _captcha: "false",
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    ...(input.message ? { message: input.message } : {}),
  }
}

export async function sendDemoRequestEmail(
  input: DemoRequestInput,
  deps?: SendDemoRequestEmailDeps
) {
  const notifyEmail =
    deps?.notifyEmail?.trim() ||
    process.env.DEMO_NOTIFY_EMAIL?.trim() ||
    DEFAULT_DEMO_NOTIFY_EMAIL

  const payload = buildFormSubmitPayload(input)
  const url = `https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`
  const doFetch = deps?.fetch ?? fetch

  const response = await doFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "")
    throw new Error(
      bodyText
        ? `FormSubmit failed (${response.status}): ${bodyText.slice(0, 200)}`
        : `FormSubmit failed (${response.status})`
    )
  }

  return { ok: true as const }
}
