import { Buffer } from 'node:buffer'

type ZoomTokenResponse = {
  access_token?: string
  expires_in?: number
}

type CachedToken = {
  accessToken: string
  expiresAt: number
}

export class ZoomApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiMessage: string,
    public readonly responseBody: string,
  ) {
    super(`Zoom API error: ${status} ${apiMessage}`)
    this.name = 'ZoomApiError'
  }
}

let cachedToken: CachedToken | null = null
let tokenRequest: Promise<string> | null = null

export function clearZoomAccessTokenCache() {
  cachedToken = null
}

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
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenUrl = new URL('https://zoom.us/oauth/token')
    tokenUrl.searchParams.set('grant_type', 'account_credentials')
    tokenUrl.searchParams.set('account_id', accountId)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
      },
      cache: 'no-store',
    })

    const body = await response.text()

    if (!response.ok) {
      console.error('Zoom OAuth token request failed', {
        status: response.status,
        body,
      })
      throw new Error('Zoom OAuth token request failed')
    }

    let payload: ZoomTokenResponse = {}
    try {
      payload = JSON.parse(body) as ZoomTokenResponse
    } catch {
      throw new Error('Zoom OAuth token response was invalid')
    }

    if (!payload.access_token) {
      throw new Error('Zoom OAuth token response did not include an access token')
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
    // Fall back to the raw response body below.
  }

  return body.trim().replace(/\s+/g, ' ').slice(0, 500) || 'Unknown Zoom API error'
}

async function requestZoom(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const userEmail = process.env.ZOOM_USER_EMAIL?.trim()

  if (!userEmail) {
    throw new Error('ZOOM_USER_EMAIL is not configured')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    throw new Error('ZOOM_USER_EMAIL is invalid')
  }

  const url = `https://api.zoom.us/v2${path}`
  let token = await getZoomAccessToken()

  const send = async () =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

  let response = await send()

  if (response.status === 401) {
    const firstResponseBody = await response.text()

    console.error('Zoom API request failed', {
      status: 401,
      path,
      body: firstResponseBody,
      retrying: true,
    })

    clearZoomAccessTokenCache()

    try {
      token = await getZoomAccessToken()
    } catch {
      throw new ZoomApiError(401, getZoomErrorMessage(firstResponseBody), firstResponseBody)
    }

    response = await send()
  }

  if (!response.ok) {
    const responseBody = await response.text()
    const message = getZoomErrorMessage(responseBody)

    console.error('Zoom API request failed', {
      status: response.status,
      path,
      body: responseBody,
    })

    throw new ZoomApiError(response.status, message, responseBody)
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
  const userEmail = process.env.ZOOM_USER_EMAIL!.trim()

  const response = await requestZoom(`/users/${encodeURIComponent(userEmail)}/meetings`, {
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

  if (typeof payload.id !== 'number' || typeof payload.join_url !== 'string') {
    throw new Error('Zoom returned an incomplete meeting response')
  }

  return payload
}

export async function deleteZoomMeeting(meetingId: string) {
  await requestZoom(`/meetings/${encodeURIComponent(meetingId)}`, {
    method: 'DELETE',
  })
}
