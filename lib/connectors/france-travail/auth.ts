/**
 * France Travail (ex-Pôle Emploi) Offres d'emploi v2 — OAuth2 client credentials.
 * Portal: https://francetravail.io — subscribe app to "Offres d'emploi v2".
 */

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire"

const DEFAULT_SCOPE = "api_offresdemploiv2 o2dsoffre"

export type FranceTravailAuthConfig = {
  clientId: string
  clientSecret: string
  scope: string
}

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null

export function readFranceTravailAuthConfig(): FranceTravailAuthConfig | null {
  const clientId =
    process.env.FRANCE_TRAVAIL_CLIENT_ID?.trim() ||
    process.env.FT_CLIENT_ID?.trim() ||
    ""
  const clientSecret =
    process.env.FRANCE_TRAVAIL_CLIENT_SECRET?.trim() ||
    process.env.FT_CLIENT_SECRET?.trim() ||
    ""
  if (!clientId || !clientSecret) return null
  const scope =
    process.env.FRANCE_TRAVAIL_SCOPE?.trim() ||
    process.env.FT_SCOPE?.trim() ||
    DEFAULT_SCOPE
  return { clientId, clientSecret, scope }
}

export function isFranceTravailConfigured(): boolean {
  return readFranceTravailAuthConfig() !== null
}

export function clearFranceTravailTokenCache(): void {
  cachedToken = null
}

export async function getFranceTravailAccessToken(
  config: FranceTravailAuthConfig = readFranceTravailAuthConfig()!,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (!config?.clientId || !config?.clientSecret) {
    throw new Error(
      "France Travail API non configurée. Ajoute FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET."
    )
  }

  const now = Date.now()
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.accessToken
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: config.scope,
  })

  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    const detail =
      payload.error_description ||
      payload.error ||
      `HTTP ${response.status}`
    throw new Error(
      `France Travail OAuth échoué: ${detail}. Vérifie la souscription « Offres d'emploi v2 » sur francetravail.io.`
    )
  }

  const expiresInSec =
    typeof payload.expires_in === "number" && payload.expires_in > 0
      ? payload.expires_in
      : 1500
  cachedToken = {
    accessToken: payload.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  }
  return payload.access_token
}
