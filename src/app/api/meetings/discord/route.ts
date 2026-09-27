import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getIntegration } from '../../../lib/integrations'
import { getSql, ensureSchema } from '../../../lib/db'
import { getWorkspaceId } from '../../../lib/workspace'

type CreateBody = {
  title: string
  startTime: string
  durationMinutes?: number
  description?: string
}

export async function POST(request: Request) {
  try {
    const orgId = await getWorkspaceId()
    const integration = await getIntegration(orgId, 'discord')
    const guildId = integration?.metadata.selectedGuildId as string | undefined
    const guildName = integration?.metadata.selectedGuildName as string | undefined
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!integration || !guildId) return NextResponse.json({ error: 'Connect Discord and select a server first' }, { status: 409 })
    if (!botToken) return NextResponse.json({ error: 'DISCORD_BOT_TOKEN is not configured' }, { status: 503 })

    const body = await request.json() as CreateBody
    if (!body.title || !body.startTime) return NextResponse.json({ error: 'title and startTime are required' }, { status: 400 })

    const start = new Date(body.startTime)
    const end = new Date(start.getTime() + Math.min(Math.max(body.durationMinutes ?? 30, 1), 1440) * 60_000)
    const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}/scheduled-events`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: body.title,
        description: body.description ?? null,
        privacy_level: 2,
        entity_type: 3,
        scheduled_start_time: start.toISOString(),
        scheduled_end_time: end.toISOString(),
        entity_metadata: { location: `https://discord.com/channels/${guildId}` },
      }),
      cache: 'no-store',
    })

    const event = await response.json() as { id?: string; name?: string; entity_metadata?: { location?: string } }
    if (!response.ok || !event.id) return NextResponse.json({ error: 'Discord event creation failed', details: event }, { status: response.status })

    await ensureSchema()
    const sql = getSql()
    await sql`
      INSERT INTO heaven_meetings
        (id, org_id, provider, external_id, title, scheduled_at, duration_minutes, join_url, metadata)
      VALUES
        (${randomUUID()}, ${orgId}, 'discord', ${event.id}, ${body.title}, ${start}, ${body.durationMinutes ?? 30}, ${event.entity_metadata?.location ?? `https://discord.com/channels/${guildId}`}, ${JSON.stringify({ guildId, guildName })}::jsonb)
    `

    return NextResponse.json({
      provider: 'discord',
      id: event.id,
      title: body.title,
      startTime: start.toISOString(),
      durationMinutes: body.durationMinutes ?? 30,
      joinUrl: event.entity_metadata?.location ?? `https://discord.com/channels/${guildId}`,
      guildName,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Discord event'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
