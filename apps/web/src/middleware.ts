import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Exclude _next, static assets, /api/health, and / (root landing page) from Clerk middleware.
    // The root page is a public marketing/welcome route — no auth required.
    // Auth-protected routes start at /dashboard (which calls auth() directly).
    '/((?!$|_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api(?!/health)|trpc)(.*)',
  ],
}
