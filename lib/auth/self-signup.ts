/**
 * Signup configuration.
 *
 * - Local development: self-signup is enabled by default so the app can be
 *   tested end to end without an external mail provider.
 * - Hosted (Supabase Auth): signup stays closed until the confirmation e-mail
 *   sender is configured and validated. Open it explicitly with
 *   ALLOW_HOSTED_SIGNUP=true.
 *
 * Override the local default with ALLOW_SELF_SIGNUP=true|false when needed.
 */
export function isSelfSignupAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false

  const raw = process.env.ALLOW_SELF_SIGNUP?.trim().toLowerCase()
  if (raw === "true" || raw === "1") return true
  if (raw === "false" || raw === "0") return false

  if (process.env.VERCEL === "1") return false

  // Localhost / local machine
  return true
}

/**
 * Hosted signup requires a validated confirmation e-mail sender in Supabase.
 * Keep it opt-in: do not infer it from NODE_ENV.
 */
export function isHostedSignupEnabled(): boolean {
  const raw = process.env.ALLOW_HOSTED_SIGNUP?.trim().toLowerCase()
  return raw === "true" || raw === "1"
}

/** Signup is available when either the local or the hosted flow is enabled. */
export function isSignupOpen(): boolean {
  return isSelfSignupAllowed() || isHostedSignupEnabled()
}

/**
 * The demo-request form is only exposed when the server can persist the request
 * (service role key) and notify the team (FormSubmit, default recipient).
 */
export function isDemoRequestEnabled(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}

export const SIGNUP_CLOSED_MESSAGE =
  "Les inscriptions sont fermées. Consulte la page d’accès pour demander une ouverture de compte."

/** @deprecated Use SIGNUP_CLOSED_MESSAGE. Kept for existing imports. */
export const SELF_SIGNUP_CLOSED_MESSAGE = SIGNUP_CLOSED_MESSAGE
