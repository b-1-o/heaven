import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ensureSchema, getSql } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { createZoomMeeting, ZoomApiError } from '@/lib/zoom-server'

export const runtime = 'nodejs'

type CreateMeetingBody = {
  topic?: unknown
  startTime?: unknown
  duration?: unknown
  timezone?: unknown
}

const LOCAL_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/
const OFFSET_ISO_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function getDateTimeParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = getDateTimeParts(date, timezone)
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return localAsUtc - date.getTime()
}

function parseStartTime(value: string, timezone?: string) {
  if (OFFSET_ISO_PATTERN.test(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (!LOCAL_ISO_PATTERN.test(value)) return null

  const wallClockMs = Date.parse(`${value}Z`)
  if (Number.isNaN(wallClockMs)) return null

  if (!timezone) {
    const date = new Date(wallClockMs)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const initialOffset = getTimezoneOffsetMs(new Date(wallClockMs), timezone)
  const candidateMs = wallClockMs - initialOffset
  const correctedOffset = getTimezoneOffsetMs(new Date(candidateMs), timezone)
  const correctedMs = wallClockMs - correctedOffset
  const candidate = new Date(correctedMs)

  const actual = getDateTimeParts(candidate, timezone)
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, secondPart = '0'] = timePart.split(':')
  const second = Number(secondPart.split('.')[0])

  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== Number(hour) ||
    actual.minute !== Number(minute) ||
    actual.second !== second
  ) {
    return null
  }

  return candidate
}

export async function POST(request: Request) {
  let workspaceId: string

  try {
    workspaceId = await getWorkspaceId()
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return errorResponse('Authentication required', 401)
    }

    console.error('Workspace authentication failed', error)
    return errorResponse('Authentication failed', 500)
  }

  let body: CreateMeetingBody

  try {
    body = await request.json() as CreateMeetingBody
  } catch {
    return errorResponse('Request body must be valid JSON', 400)
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : ''
  const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : undefined
  const duration = typeof body.duration === 'number'
    ? body.duration
    : typeof body.duration === 'string'
      ? Number(body.duration)
      : NaN

  if (!topic) return errorResponse('Topic is required', 400)
  if (topic.length > 200) return errorResponse('Topic must be 200 characters or fewer', 400)
  if (!startTime) return errorResponse('Start time is required', 400)
  if (!Number.isFinite(duration) || !Number.isInteger(duration) || duration < 1 || duration > 1440) {
    return errorResponse('Duration must be an integer between 1 and 1440 minutes', 400)
  }

  if (body.timezone !== undefined && (!timezone || !isValidTimezone(timezone))) {
    return errorResponse('Timezone is invalid', 400)
  }

  const parsedStartTime = parseStartTime(startTime, timezone)

  if (!parsedStartTime) {
    return errorResponse('Start time must be a valid ISO date and timezone combination', 400)
  }

  if (parsedStartTime.getTime() <= Date.now()) {
    return errorResponse('Start time must be in the future', 400)
  }

  try {
    const meeting = await createZoomMeeting({
      topic,
      startTime,
      duration,
      timezone,
    })

    const dbMeetingId = randomUUID()
    let persisted = false

    try {
      await ensureSchema()
      const sql = getSql()

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
            ${parsedStartTime},
            ${meeting.duration ?? duration},
            ${meeting.join_url},
            ${meeting.start_url ?? null},
            ${JSON.stringify({
              password: meeting.password ?? null,
              authMode: 's2s',
            })}::jsonb
          )
      `
      persisted = true
    } catch (databaseError) {
      console.error('Failed to persist Zoom meeting locally', databaseError)
    }

    return NextResponse.json({
      id: String(meeting.id),
      join_url: meeting.join_url,
      password: meeting.password ?? null,
      topic: meeting.topic ?? topic,
      startTime: meeting.start_time ?? parsedStartTime.toISOString(),
      duration: meeting.duration ?? duration,
      timezone: timezone ?? meeting.timezone ?? null,
      dbId: persisted ? dbMeetingId : null,
    })
  } catch (error) {
    if (error instanceof ZoomApiError) {
      return errorResponse(error.message, 502)
    }

    if (error instanceof Error && (
      error.message.startsWith('Zoom Server-to-Server OAuth is not configured') ||
      error.message === 'ZOOM_USER_EMAIL is not configured' ||
      error.message === 'ZOOM_USER_EMAIL is invalid'
    )) {
      return errorResponse(error.message, 503)
    }

    console.error('Zoom create-meeting error', error)
    return errorResponse('Failed to create Zoom meeting', 500)
  }
}
