import { NextResponse } from 'next/server'
import { ensureSchema, getSql } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'

export async function GET() {
  try {
    const orgId = await getWorkspaceId()
    await ensureSchema()
    const sql = getSql()
    const events = await sql`
      SELECT id, github_event_id, event_type, repository, actor_login, summary, occurred_at
      FROM heaven_activity
      WHERE org_id = ${orgId}
      ORDER BY occurred_at DESC
      LIMIT 100
    `
    return NextResponse.json({ events })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load activity'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
