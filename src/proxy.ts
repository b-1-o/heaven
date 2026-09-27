import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtected = createRouteMatcher(['/api(.*)', '/((?!sign-in|sign-up|_next|favicon.ico).*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isProtected(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
