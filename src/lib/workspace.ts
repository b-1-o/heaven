import { auth } from '@clerk/nextjs/server'

export async function getWorkspaceId() {
  const { userId, orgId } = await auth()
  if (!userId) throw new Error('UNAUTHENTICATED')
  return orgId ?? `user:${userId}`
}
