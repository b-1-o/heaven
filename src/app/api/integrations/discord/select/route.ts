import { NextResponse } from 'next/server'
import { getWorkspaceId } from '../../../../lib/workspace'
import { getIntegration, saveIntegration } from '../../../../lib/integrations'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { guildId?: string; guildName?: string }
    if (!body.guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 })

    const orgId = await getWorkspaceId()
    const integration = await getIntegration(orgId, 'discord')
    if (!integration) return NextResponse.json({ error: 'Discord is not connected' }, { status: 409 })

    await saveIntegration({
      orgId,
      provider: 'discord',
      accountId: integration.accountId,
      accountName: integration.accountName ?? undefined,
      accessToken: integration.accessToken ?? undefined,
      expiresAt: integration.expiresAt,
      metadata: { ...integration.metadata, selectedGuildId: body.guildId, selectedGuildName: body.guildName ?? null },
    })

    return NextResponse.json({ selectedGuildId: body.guildId, selectedGuildName: body.guildName ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to select Discord server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
