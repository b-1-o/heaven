import { Buffer } from 'node:buffer'

type ZoomTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
}

type CachedToken = {
  accessToken: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null
let tokenRequest: Promise<string> | null = null

export async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      'Zoom Server-to-Server OAuth is not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET.',
    )
  }

  const refreshWindow = 60_000
  if (cachedToken && cachedToken.expiresAt > Date.now() + refreshWindow) {
    return cachedToken.accessToken
  }

  if (tokenRequest) return tokenRequest

  tokenRequest = (async () => {
    const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64')
    const tokenUrl = new URL('https://zoom.us/oauth/token')
    tokenUrl.searchParams.set('grant_type', 'account_credentials')
    tokenUrl.searchParams.set('account_id', accountId)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + basic,
      },
      cache: 'no-store',
    })

    const text = await response.text()
    let payload: ZoomTokenResponse | { reason?: string; error?: string; error_description?: string } = {}

    try {
      payload = JSON.parse(text) as typeof payload
    } catch {
      // Zoom should return JSON, but keep the error safe if it does not.
    }

    if (!response.ok) {
      const reason =
        ('error_description' in payload && payload.error_description) ||
        ('reason' in payload && payload.reason) ||
        ('error' in payload && payload.error) ||
        'Zoom token request failed'
      throw new Error(reason)
    }

    if (!('access_token' in payload) || !payload.access_token) {
      throw new Error('Zoom token response did not include an access token')
    }

    const expiresIn = typeof payload.expires_in === 'number' && payload.expires_in > 0
      ? payload.expires_in
      : 3600

    cachedToken = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    }

    return payload.access_token
  })()

  try {
    return await tokenRequest
  } finally {
    tokenRequest = null
  }
}
