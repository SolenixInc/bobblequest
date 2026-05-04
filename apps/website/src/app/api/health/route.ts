export const dynamic = 'force-dynamic'

export function GET() {
  const siteUrl = process.env.SITE_URL

  if (!siteUrl) {
    return Response.json({ ok: false, api: 'unreachable' }, { status: 503 })
  }

  return Response.json({ ok: true, api: 'ok' })
}
