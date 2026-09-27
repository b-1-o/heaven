import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exchangeGithubCode } from '@/lib/github'
import { saveGithubConnection } from '@/lib/github-connection'
import { getWorkspaceId } from '@/lib/workspace'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url))

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('heaven_github_state')?.value

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: 'Invalid GitHub OAuth state' }, { status: 400 })
  }

  try {
    const token = await exchangeGithubCode(code)
    if (!token.access_token) {
      return NextResponse.json({ error: token.error_description ?? 'GitHub authorization failed' }, { status: 400 })
    }

    await saveGithubConnection(await getWorkspaceId(), {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in,
    })

    const response = NextResponse.redirect(new URL('/?github=connected', request.url))
    response.cookies.delete('heaven_github_state')
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub connection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
