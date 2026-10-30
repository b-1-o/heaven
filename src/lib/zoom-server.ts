import { Buffer } from 'node:buffer'

type ZoomTokenResponse = {
  access_token?: string
  expires_in?: number
}

type CachedToken = {
  accessToken: string
  expiresAt: number
}

export class ZoomConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZoomConfigurationError'
  }
}

export class ZoomOAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiMessage: string,
  ) {
    super(\`Zoom OAuth error: \${status} \${apiMessage}\`)
    this.name = 'ZoomOAuthError'
  }
}

export class ZoomApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiMessage: string,
    public readonly responseBody: string,
  ) {
    super(\`Zoom API error: \${status} \${apiMessage}\`)
    this.name = 'ZoomApiError'
  }
}

let cachedToken: CachedToken | null = null
let tokenRequest: Promise<string> | null = null

export function clearZoomAccessTokenCache() {
  cachedToken = null
}

function getZoomCredentials() {
  const accountId = process.env.ZOOM_ACCOUNT_ID?.trim()
  const clientId = process.env.ZOOM_CLIENT_ID?.trim()
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim()

  const missing = [
    !accountId ? 'ZOOM_ACCOUNT_ID' : null,
    !clientId ? 'ZOOM_CLIENT_ID' : null,
    !clientSecret ? 'ZOOM_CLIENT_SECRET' : null,
  ].filter((value): value is string => Boolean(value))

  if (missing.length) {
    throw new ZoomConfigurationError(\`Missing Zoom configuration: \${missing.join(', ')}.\`)
  }

  return { accountId: accountId!, clientId: clientId!, clientSecret: clientSecret! }
}

export function getZoomHostUserId() {
  const userId = process.env.ZOOM_USER_ID?.trim() || process.env.ZOOM_USER_EMAIL?.trim()

  if (!userId) {
    throw new ZoomConfigurationError('Set ZOOM_USER_ID or ZOOM_USER_EMAIL to select the Zoom meeting host.')
  }

  if (userId.length > 254 || /\s/.test(userId)) {
    throw new ZoomConfigurationError('ZOOM_USER_ID / ZOOM_USER_EMAIL must be a valid Zoom user ID or email address.')
  }

  return userId
}

export async function getZoomAccessToken(): Promise<string> {
  const { accountId, clientId, clientSecret } = getZoomCredentials()
  const refreshWindow = 60_000

  if (cachedToken && cachedToken.expiresAt > Date.now() + refreshWindow) {
    return cachedToken.accessToken
  }

  if (tokenRequest) return tokenRequest

  tokenRequest = (async () => {
    const basic = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')
    const form = new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    })

    let response: Response
    try {
      response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: \`Basic \${basic}\`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new ZoomOAuthError(502, 'Could not reach Zoom OAuth. Check the server network and try again.')
    }

    const body = await response.text()

    if (!response.ok) {
      throw new ZoomOAuthError(response.status, getZoomErrorMessage(body))
    }

    let payload: ZoomTokenResponse = {}
    try {
      payload = JSON.parse(body) as ZoomTokenResponse
    } catch {
      throw new ZoomOAuthError(502, 'Zoom returned an invalid token response.')
    }

    if (!payload.access_token) {
      throw new ZoomOAuthError(502, 'Zoom token response did not include an access token.')
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

function getZoomErrorMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as {
      message?: unknown
      reason?: unknown
      error?: unknown
    }

    for (const value of [parsed.message, parsed.reason, parsed.error]) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim().slice(0, 500)
      }
    }
  } catch {
    // Fall back to a short plain-text response below.
  }

  return body.trim().replace(/\s+/g, ' ').slice(0, 500) || 'Unknown Zoom error'
}

async function requestZoom(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = \`https://api.zoom.us/v2\${path}\`
  let token = await getZoomAccessToken()

  const send = async () => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', \`Bearer \${token}\`)
    headers.set('Accept', 'application/json')

    try {
      return await fetch(url, {
        ...init,
        headers,
        cache: 'no-store',
        signal: init.signal ?? AbortSignal.timeout(20_000),
      })
    } catch {
      throw new ZoomApiError(502, 'Could not reach the Zoom API.', '')
    }
  }

  let response = await send()

  if (response.status === 401) {
    const firstResponseBody = await response.text()
    clearZoomAccessTokenCache()

    try {
      token = await getZoomAccessToken()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token renewal failed'
      throw new ZoomApiError(401, message, firstResponseBody)
    }

    // Retry the original request exactly once with the newly issued token.
    response = await send()
  }

  if (!response.ok) {
    const responseBody = await response.text()
    throw new ZoomApiError(response.status, getZoomErrorMessage(responseBody), responseBody)
  }

  return response
}

export type CreateZoomMeetingInput = {
  topic: string
  startTime: string
  duration: number
  timezone?: string
}

export type CreatedZoomMeeting = {
  id: number
  topic?: string
  join_url?: string
  start_url?: string
  password?: string
  start_time?: string
  duration?: number
  timezone?: string
}

export async function createZoomMeeting(input: CreateZoomMeetingInput): Promise<CreatedZoomMeeting> {
  const hostUserId = getZoomHostUserId()

  const response = await requestZoom(\`/users/\${encodeURIComponent(hostUserId)}/meetings\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: input.topic,
      type: 2,
      start_time: input.startTime,
      duration: input.duration,
      ...(input.timezone ? { timezone: input.timezone } : {}),
      settings: {
        waiting_room: true,
        join_before_host: false,
      },
    }),
  })

  const payload = await response.json() as CreatedZoomMeeting

  if (typeof payload.id !== 'number' || typeof payload.join_url !== 'string' || !payload.join_url.startsWith('https://')) {
    throw new ZoomApiError(502, 'Zoom returned an incomplete meeting response.', JSON.stringify(payload))
  }

  return payload
}

export async function deleteZoomMeeting(meetingId: string) {
  await requestZoom(\`/meetings/\${encodeURIComponent(meetingId)}\`, {
    method: 'DELETE',
  })
}
