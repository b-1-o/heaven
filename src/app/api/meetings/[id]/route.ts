import { NextResponse } from 'next/server'
import { ensureSchema, getSql } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { ZoomApiError, deleteZoomMeeting } from '@/lib/zoom-server'

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
    ` as Array<{
      id: string
      provider: string
      external_id: string | null
      metadata: { authMode?: string } | null
    }>

    const meeting = rows[0]
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (meeting.provider === 'zoom' && meeting.external_id) {
      try {
        await deleteZoomMeeting(meeting.external_id)
      } catch (error) {
        if (!(error instanceof ZoomApiError && error.status === 404)) {
          throw error
        }
      }
    }

    await sql`
      DELETE FROM heaven_meetings
      WHERE id = ${id}::uuid AND org_id = ${orgId}
    `

    return NextResponse.json({ deleted: true, id })
  } catch (error) {
    if (error instanceof ZoomApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    const message = error instanceof Error ? error.message : 'Failed to delete meeting'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
