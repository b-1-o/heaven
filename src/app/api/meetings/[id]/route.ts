import { NextResponse } from 'next/server'
import { getIntegration } from '@/lib/integrations'
import { getWorkspaceId } from '@/lib/workspace'
import { ensureSchema, getSql } from '@/lib/db'

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
      SELECT id, provider, external_id
      FROM heaven_meetings
      WHERE id = ${id}::uuid AND org_id = ${orgId}
      LIMIT 1
    ` as Array<{ id: string; provider: string; external_id: string | null }>

    const meeting = rows[0]
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    if (meeting.provider === 'zoom' && meeting.external_id) {
      const integration = await getIntegration(orgId, 'zoom')
      if (integration?.accessToken) {
        const response = await fetch(
          'https://api.zoom.us/v2/meetings/' + encodeURIComponent(meeting.external_id),
          { method: 'DELETE', headers: { Authorization: 'Bearer ' + integration.accessToken }, cache: 'no-store' },
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
