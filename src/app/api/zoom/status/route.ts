import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/workspace'
import { getZoomAccessToken, ZoomConfigurationError, ZoomOAuthError } from '@/lib/zoom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await getWorkspaceId()
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 500
    return NextResponse.json({
      ready: false,
      error: status === 401 ? 'Authentication required' : 'Could not verify the HEAVEN workspace',
    }, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const configured = {
    accountId: Boolean(process.env.ZOOM_ACCOUNT_ID?.trim()),
    clientId: Boolean(process.env.ZOOM_CLIENT_ID?.trim()),
    clientSecret: Boolean(process.env.ZOOM_CLIENT_SECRET?.trim()),
    hostUser: Boolean(process.env.ZOOM_USER_ID?.trim() || process.env.ZOOM_USER_EMAIL?.trim()),
  }

  const missing = Object.entries(configured)
    .filter(([, present]) => !present)
    .map(([key]) => key)

  if (missing.length) {
    return NextResponse.json({
      ready: false,
      authenticated: false,
      configured,
      missing,
      error: 'Zoom environment variables are missing. Configure them in Vercel and redeploy.',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    await getZoomAccessToken()
    return NextResponse.json({
      ready: true,
      authenticated: true,
      configured,
      message: 'Zoom Server-to-Server OAuth credentials were accepted.',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof ZoomConfigurationError || error instanceof ZoomOAuthError
      ? error.message
      : 'Zoom credential verification failed. Check the HEAVEN runtime logs.'

    return NextResponse.json({
      ready: false,
      authenticated: false,
      configured,
      error: message,
    }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
