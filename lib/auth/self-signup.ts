/**
 * Self-signup is for local development only.
 * On Vercel, accounts are created after an Inscription démo request.
 *
 * Override with ALLOW_SELF_SIGNUP=true|false when needed.
 */
export function isSelfSignupAllowed(): boolean {
  const raw = process.env.ALLOW_SELF_SIGNUP?.trim().toLowerCase()
  if (raw === "true" || raw === "1") return true
  if (raw === "false" || raw === "0") return false

  // Any Vercel deployment (production or preview) → closed
  if (process.env.VERCEL === "1") return false

  // Localhost / local machine
  return true
}

export const SELF_SIGNUP_CLOSED_MESSAGE =
  "Les inscriptions sont fermées. Demande un accès démo depuis la page d’accueil."
