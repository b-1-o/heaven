import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ensureSchema, getSql } from '@/lib/db'

function signatureMatches(body: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret || !signature?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`)
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function summarize(event: string, payload: Record<string, any>) {
  const repo = payload.repository?.full_name ?? 'GitHub repository'
  const actor = payload.sender?.login ?? payload.pusher?.name ?? 'GitHub'
  if (event === 'push') {
    const count = Array.isArray(payload.commits) ? payload.commits.length : 0
    return `${actor} pushed ${count || 'new'} commit${count === 1 ? '' : 's'} to ${repo}`
  }
  if (event === 'pull_request') {
    return `${actor} ${payload.action ?? 'updated'} pull request #${payload.number ?? ''} in ${repo}`
  }
  if (event === 'workflow_run') {
    return `Workflow “${payload.workflow_run?.name ?? 'CI'}” ${payload.action ?? 'updated'} in ${repo}`
  }
  if (event === 'deployment_status') {
    return `Deployment ${payload.deployment_status?.state ?? 'updated'} for ${repo}`
  }
  if (event === 'issues') {
    return `${actor} ${payload.action ?? 'updated'} issue #${payload.issue?.number ?? ''} in ${repo}`
  }
  if (event === 'issue_comment') {
    return `${actor} ${payload.action ?? 'updated'} a comment in ${repo}`
  }
  return `GitHub event received for ${repo}`
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!signatureMatches(body, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event') ?? 'unknown'
  const eventId = request.headers.get('x-github-delivery')
  const payload = JSON.parse(body) as Record<string, any>

  try {
    await ensureSchema()
    const sql = getSql()
    const repo = payload.repository?.full_name ?? null
    const candidateRows = repo
      ? (await sql`SELECT DISTINCT org_id FROM heaven_repositories WHERE full_name = ${repo}`) as unknown as Array<{ org_id: string }>
      : []

    const orgIds = candidateRows.map((row) => String(row.org_id))
    for (const orgId of orgIds) {
      await sql`
        INSERT INTO heaven_activity
          (id, org_id, github_event_id, event_type, repository, actor_login, summary, payload)
        VALUES
          (${randomUUID()}, ${orgId}, ${eventId}, ${event}, ${repo}, ${payload.sender?.login ?? payload.pusher?.name ?? null}, ${summarize(event, payload)}, ${JSON.stringify(payload)}::jsonb)
      `
    }

    return NextResponse.json({ ok: true, deliveredTo: orgIds.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
