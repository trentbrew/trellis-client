/**
 * Decode a Google ID token (JWT) to extract profile claims.
 * This is a client-side decode only — no signature verification needed
 * because InstantDB already verifies the token server-side.
 */
export interface GoogleProfile {
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

export function decodeGoogleJwt(idToken: string): GoogleProfile | null {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      email: payload.email ?? undefined,
      name: payload.name ?? undefined,
      given_name: payload.given_name ?? undefined,
      family_name: payload.family_name ?? undefined,
      picture: payload.picture ?? undefined,
    }
  } catch (err) {
    console.warn('[decodeGoogleJwt] Failed to decode ID token:', err)
    return null
  }
}
