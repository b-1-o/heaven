import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ensureSchema, getSql } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { getZoomAccessToken } from '@/lib/zoom-server'

export const runtime = 'nodejs'

type CreateMeetingBody = {
  topic?: unknown
  startTime?: unknown
  duration?: unknown
  timezone?: unknown
}

type ZoomMeetingResponse = {
  id?: number
  topic?: string
  join_url?: string
  start_url?: string
  password?: string
  start_time?: string
  duration?: number
}

type ZoomErrorResponse = {
  code?: number
  message?: string
  error?: string
}

function errorResponse(message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...details }, { status })
}

export async function POST(request: Request) {
  let workspaceId: string

  try {
    workspaceId = await getWorkspaceId()
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return errorResponse('Authentication required', 401)
    }
    throw error
  }

  try {
    let body: CreateMeetingBody
    try {
      body = await request.json() as CreateMeetingBody
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : ''
    const duration = typeof body.duration === 'number'
      ? body.duration
      : typeof body.duration === 'string'
        ? Number(body.duration)
        : NaN
    const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : ''

    if (!topic) return errorResponse('topic is required', 400)
    if (topic.length > 200) return errorResponse('topic must be 200 characters or fewer', 400)
    if (!startTime) return errorResponse('startTime is required', 400)
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
      return errorResponse('duration must be between 1 and 1440 minutes', 400)
    }

    // Allow both datetime-local values (with an explicit timezone field)
    // and full ISO-8601 timestamps that already contain an offset.
    const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(startTime)
    if (!hasExplicitOffset && !timezone) {
      return errorResponse('timezone is required when startTime has no UTC offset', 400)
    }

    const token = await getZoomAccessToken()

    const zoomPayload: Record<string, unknown> = {
      topic,
      type: 2,
      start_time: startTime,
      duration: Math.round(duration),
      settings: {
        waiting_room: true,
        join_before_host: false,
      },
    }

    if (timezone) zoomPayload.timezone = timezone

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zoomPayload),
      cache: 'no-store',
    })

    const responseText = await response.text()
    let meeting: ZoomMeetingResponse | ZoomErrorResponse = {}

    try {
      meeting = JSON.parse(responseText) as typeof meeting
    } catch {
      // Keep the response safe if Zoom returns a non-JSON body.
    }

    if (!response.ok) {
      const message =
        ('message' in meeting && meeting.message) ||
        ('error' in meeting && meeting.error) ||
        'Zoom meeting creation failed'

      const status = response.status === 401 || response.status === 403
        ? 502
        : response.status >= 400 && response.status < 500
          ? response.status
          : 502

      return errorResponse(message, status, {
        zoomCode: 'code' in meeting ? meeting.code : undefined,
      })
    }

    if (
      !('id' in meeting) ||
      typeof meeting.id !== 'number' ||
      !('join_url' in meeting) ||
      typeof meeting.join_url !== 'string'
    ) {
      return errorResponse('Zoom returned an incomplete meeting response', 502)
    }

    const dbMeetingId = randomUUID()

    try {
      await ensureSchema()
      const sql = getSql()

      const scheduledAt = meeting.start_time
        ? new Date(meeting.start_time)
        : hasExplicitOffset
          ? new Date(startTime)
          : new Date()

      await sql`
        INSERT INTO heaven_meetings
          (id, org_id, provider, external_id, title, scheduled_at, duration_minutes, join_url, host_url, metadata)
        VALUES
          (
            ${dbMeetingId},
            ${workspaceId},
            'zoom',
            ${String(meeting.id)},
            ${topic},
            ${scheduledAt},
            ${meeting.duration ?? Math.round(duration)},
            ${meeting.join_url},
            ${meeting.start_url ?? null},
            ${JSON.stringify({
              password: meeting.password ?? null,
              authMode: 's2s',
            })}::jsonb
          )
      `
    } catch (databaseError) {
      console.error('Failed to persist Zoom meeting locally', databaseError)
    }

    return NextResponse.json({
      id: String(meeting.id),
      join_url: meeting.join_url,
      password: meeting.password ?? null,
      topic: meeting.topic ?? topic,
      startTime: meeting.start_time ?? startTime,
      duration: meeting.duration ?? Math.round(duration),
      timezone: timezone || null,
      dbId: dbMeetingId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Zoom meeting'

    if (message.startsWith('Zoom Server-to-Server OAuth is not configured')) {
      return errorResponse(message, 503)
    }

    console.error('Zoom create-meeting error', error)
    return errorResponse(message, 500)
  }
}
