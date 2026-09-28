import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/workspace'
import { getIntegration } from '@/lib/integrations'

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, secret: string) {
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const unsigned = encodedHeader + '.' + encodedPayload
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url')
  return unsigned + '.' + signature
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const meetingNumber = url.searchParams.get('meetingNumber')
    const role = url.searchParams.get('role') === '0' ? 0 : 1

    if (!meetingNumber || !/^\d{9,12}$/.test(meetingNumber.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'A valid Zoom meeting number is required' }, { status: 400 })
    }

    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Zoom Meeting SDK credentials are not configured' }, { status: 503 })
    }

    const integration = await getIntegration(await getWorkspaceId(), 'zoom')
    if (!integration?.accessToken) {
      return NextResponse.json({ error: 'Zoom is not connected' }, { status: 409 })
    }

    const now = Math.floor(Date.now() / 1000) - 30
    const exp = now + 60 * 60
    const payload = {
      appKey: clientId,
      mn: meetingNumber.replace(/\s/g, ''),
      role,
      iat: now,
      exp,
      tokenExp: exp,
    }

    const signature = signJwt({ alg: 'HS256', typ: 'JWT' }, payload, clientSecret)

    let zak: string | null = null
    if (role === 1) {
      const zakResponse = await fetch(
        `https://api.zoom.us/v2/users/${encodeURIComponent(integration.accountId)}/token?type=zak`,
        {
          headers: { Authorization: `Bearer ${integration.accessToken}` },
          cache: 'no-store',
        },
      )
      const zakData = await zakResponse.json() as { token?: string; code?: number; message?: string }
      if (!zakResponse.ok || !zakData.token) {
        return NextResponse.json(
          { error: zakData.message ?? 'Zoom did not return a ZAK token' },
          { status: zakResponse.status || 502 },
        )
      }
      zak = zakData.token
    }

    return NextResponse.json({
      signature,
      zak,
      meetingNumber: payload.mn,
      role,
      userName: integration.accountName || 'Erik',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Zoom Meeting SDK signature'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
