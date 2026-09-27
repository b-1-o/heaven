import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const clientId = process.env.ZOOM_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'ZOOM_CLIENT_ID is not configured' }, { status: 503 })

  const state = randomUUID()
  const callback = new URL('/api/integrations/zoom/callback', request.url)
  const url = new URL('https://zoom.us/oauth/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', process.env.ZOOM_REDIRECT_URI ?? callback.toString())
  url.searchParams.set('state', state)

  const response = NextResponse.redirect(url)
  response.cookies.set('heaven_zoom_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
