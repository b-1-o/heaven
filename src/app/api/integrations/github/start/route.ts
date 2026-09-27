import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GITHUB_CLIENT_ID is not configured' }, { status: 503 })
  }

  const state = randomUUID()
  const callback = new URL('/api/integrations/github/callback', request.url)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callback.toString())
  url.searchParams.set('scope', 'read:user user:email repo')
  url.searchParams.set('state', state)

  const response = NextResponse.redirect(url)
  response.cookies.set('heaven_github_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
