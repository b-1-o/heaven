import { Buffer } from 'node:buffer'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWorkspaceId } from '../../../../../lib/workspace'
import { saveIntegration } from '../../../../../lib/integrations'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url))

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expected = cookieStore.get('heaven_zoom_state')?.value

  if (!code || !state || state !== expected) {
    return NextResponse.json({ error: 'Invalid Zoom OAuth state' }, { status: 400 })
  }

  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const redirectUri = process.env.ZOOM_REDIRECT_URI ?? new URL('/api/integrations/zoom/callback', request.url).toString()
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'Zoom OAuth is not configured' }, { status: 503 })

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      cache: 'no-store',
    })

    const token = await response.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }

    if (!response.ok || !token.access_token) {
      return NextResponse.json({ error: 'Zoom token exchange failed' }, { status: 400 })
    }

    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    })
    const me = await meResponse.json() as { id?: string; email?: string; first_name?: string; last_name?: string }

    await saveIntegration({
      orgId: await getWorkspaceId(),
      provider: 'zoom',
      accountId: me.id ?? me.email ?? randomUUID(),
      accountName: me.email ?? `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim(),
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      metadata: { scope: token.scope ?? null },
    })

    const result = NextResponse.redirect(new URL('/?zoom=connected', request.url))
    result.cookies.delete('heaven_zoom_state')
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Zoom connection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
