import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * App favicon — renders a simple "T" monogram on a dark background.
 * Replace with a real brand icon when the template is adopted.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: '#0f172a',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'sans-serif',
      }}
    >
      T
    </div>,
    { ...size },
  )
}
