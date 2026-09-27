import { NextResponse } from 'next/server'
import { getSql, ensureSchema } from '../../../lib/db'
import { getWorkspaceId } from '../../../lib/workspace'

export async function GET() {
  try {
    const orgId = await getWorkspaceId()
    await ensureSchema()
    const sql = getSql()
    const meetings = await sql`
      SELECT id, provider, external_id, title, scheduled_at, duration_minutes, join_url, host_url, metadata
      FROM heaven_meetings
      WHERE org_id = ${orgId}
      ORDER BY scheduled_at DESC
      LIMIT 100
    `
    return NextResponse.json({ meetings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load meetings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
