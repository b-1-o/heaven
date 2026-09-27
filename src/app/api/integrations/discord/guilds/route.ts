import { NextResponse } from 'next/server'
import { getIntegration } from '../../../../lib/integrations'
import { getWorkspaceId } from '../../../../lib/workspace'

export async function GET() {
  try {
    const integration = await getIntegration(await getWorkspaceId(), 'discord')
    if (!integration) return NextResponse.json({ connected: false, guilds: [] })
    const guilds = Array.isArray(integration.metadata.guilds) ? integration.metadata.guilds : []
    return NextResponse.json({ connected: true, guilds, selectedGuildId: integration.metadata.selectedGuildId ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Discord guilds'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
