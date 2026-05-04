import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    return NextResponse.json({ ok: false, api: 'unreachable' }, { status: 503 })
  }

  try {
    const res = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, api: 'unreachable' }, { status: 503 })
    }

    return NextResponse.json({ ok: true, api: 'ok' })
  } catch {
    return NextResponse.json({ ok: false, api: 'unreachable' }, { status: 503 })
  }
}
