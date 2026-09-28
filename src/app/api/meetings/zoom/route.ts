import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/workspace'
import { getIntegration, saveIntegration } from '@/lib/integrations'
import { getSql, ensureSchema } from '@/lib/db'

type CreateBody = {
  title: string
  startTime: string
  durationMinutes?: number
  agenda?: string
}

async function refreshZoomToken(orgId: string, integration: Awaited<ReturnType<typeof getIntegration>>) {
  if (!integration?.refreshToken) throw new Error('Zoom is not connected')
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Zoom OAuth is not configured')

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
    }),
    cache: 'no-store',
  })
  const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!response.ok || !token.access_token) throw new Error('Zoom token refresh failed')

  await saveIntegration({
    orgId,
    provider: 'zoom',
    accountId: integration.accountId,
    accountName: integration.accountName ?? undefined,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? integration.refreshToken,
    expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    metadata: integration.metadata,
  })

  return token.access_token
}

export async function POST(request: Request) {
  try {
    const orgId = await getWorkspaceId()
    const body = await request.json() as CreateBody
    if (!body.title || !body.startTime) return NextResponse.json({ error: 'title and startTime are required' }, { status: 400 })

    let integration = await getIntegration(orgId, 'zoom')
    if (!integration) return NextResponse.json({ error: 'Zoom is not connected' }, { status: 409 })

    let token = integration.accessToken
    if (!token || (integration.expiresAt && integration.expiresAt.getTime() < Date.now() + 60_000)) {
      token = await refreshZoomToken(orgId, integration)
    }

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: body.title,
        type: 2,
        start_time: new Date(body.startTime).toISOString(),
        duration: Math.min(Math.max(body.durationMinutes ?? 30, 1), 1440),
        agenda: body.agenda,
        settings: {
          waiting_room: true,
          join_before_host: false,
        },
      }),
      cache: 'no-store',
    })

    const meeting = await response.json() as {
      id?: number
      join_url?: string
      start_url?: string
      start_time?: string
      duration?: number
      password?: string
    }
    if (!response.ok || !meeting.id) return NextResponse.json({ error: 'Zoom meeting creation failed', details: meeting }, { status: response.status })

    await ensureSchema()
    const sql = getSql()
    await sql`
      INSERT INTO heaven_meetings
        (id, org_id, provider, external_id, title, scheduled_at, duration_minutes, join_url, host_url, metadata)
      VALUES
        (${randomUUID()}, ${orgId}, 'zoom', ${String(meeting.id)}, ${body.title}, ${meeting.start_time ? new Date(meeting.start_time) : new Date(body.startTime)}, ${meeting.duration ?? body.durationMinutes ?? 30}, ${meeting.join_url ?? null}, ${meeting.start_url ?? null}, ${JSON.stringify({ password: meeting.password ?? null })}::jsonb)
    `

    return NextResponse.json({
      provider: 'zoom',
      id: String(meeting.id),
      title: body.title,
      startTime: meeting.start_time,
      durationMinutes: meeting.duration,
      joinUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      password: meeting.password ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Zoom meeting'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
