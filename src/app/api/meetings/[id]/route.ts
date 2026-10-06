import { NextResponse } from 'next/server'
import { getIntegration } from '@/lib/integrations'
import { getWorkspaceId } from '@/lib/workspace'
import { ensureSchema, getSql } from '@/lib/db'
import { getZoomAccessToken } from '@/lib/zoom-server'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const orgId = await getWorkspaceId()
    await ensureSchema()
    const sql = getSql()
    const rows = await sql`
      SELECT id, provider, external_id, metadata
      FROM heaven_meetings
      WHERE id = ${id}::uuid AND org_id = ${orgId}
      LIMIT 1
    ` as Array<{ id: string; provider: string; external_id: string | null; metadata: { authMode?: string } | null }>

    const meeting = rows[0]
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    if (meeting.provider === 'zoom' && meeting.external_id) {
      const metadata = meeting.metadata
      let accessToken: string | null = null

      if (metadata?.authMode === 's2s') {
        accessToken = await getZoomAccessToken().catch(() => null)
      } else {
        const integration = await getIntegration(orgId, 'zoom')
        accessToken = integration?.accessToken ?? null
      }

      if (accessToken) {
        const response = await fetch(
          'https://api.zoom.us/v2/meetings/' + encodeURIComponent(meeting.external_id),
          { method: 'DELETE', headers: { Authorization: 'Bearer ' + accessToken }, cache: 'no-store' },
        )
        if (!response.ok && response.status !== 404) {
          const detail = await response.text()
          return NextResponse.json({ error: 'Zoom meeting could not be deleted', details: detail }, { status: response.status })
        }
      }
    }

    await sql`
      DELETE FROM heaven_meetings
      WHERE id = ${id}::uuid AND org_id = ${orgId}
    `

    return NextResponse.json({ deleted: true, id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete meeting'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
