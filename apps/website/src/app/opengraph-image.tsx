import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function RootOGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        gap: '16px',
      }}
    >
      <h1
        style={{
          fontSize: '80px',
          fontWeight: 700,
          color: '#f8fafc',
          margin: 0,
          fontFamily: 'sans-serif',
        }}
      >
        Template Site
      </h1>
      <p
        style={{
          fontSize: '28px',
          color: '#94a3b8',
          margin: 0,
          fontFamily: 'sans-serif',
        }}
      >
        Marketing site scaffold for the template-repo monorepo.
      </p>
    </div>,
    { ...size },
  )
}
