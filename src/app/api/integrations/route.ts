import { NextResponse } from 'next/server'
import { listIntegrations } from '../../../lib/integrations'
import { getWorkspaceId } from '../../../lib/workspace'

export async function GET() {
  try {
    const integrations = await listIntegrations(await getWorkspaceId())
    return NextResponse.json({ integrations })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load integrations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
