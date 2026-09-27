import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { saveIntegration } from '../../../../../lib/integrations'
import { getWorkspaceId } from '../../../../../lib/workspace'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url))

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expected = cookieStore.get('heaven_discord_state')?.value

  if (!code || !state || state !== expected) {
    return NextResponse.json({ error: 'Invalid Discord OAuth state' }, { status: 400 })
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const redirectUri = process.env.DISCORD_REDIRECT_URI ?? new URL('/api/integrations/discord/callback', request.url).toString()
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'Discord OAuth is not configured' }, { status: 503 })

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      cache: 'no-store',
    })
    const token = await tokenResponse.json() as { access_token?: string; expires_in?: number; scope?: string }
    if (!tokenResponse.ok || !token.access_token) return NextResponse.json({ error: 'Discord token exchange failed' }, { status: 400 })

    const headers = { Authorization: `Bearer ${token.access_token}` }
    const meResponse = await fetch('https://discord.com/api/v10/users/@me', { headers, cache: 'no-store' })
    const me = await meResponse.json() as { id?: string; username?: string }
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', { headers, cache: 'no-store' })
    const guilds = await guildsResponse.json() as Array<{ id: string; name: string; permissions: string }>

    await saveIntegration({
      orgId: await getWorkspaceId(),
      provider: 'discord',
      accountId: me.id ?? randomUUID(),
      accountName: me.username ?? 'Discord user',
      accessToken: token.access_token,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      metadata: { guilds, scope: token.scope ?? null },
    })

    const result = NextResponse.redirect(new URL('/?discord=connected', request.url))
    result.cookies.delete('heaven_discord_state')
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord connection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
