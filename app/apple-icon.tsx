import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #ff5722 0%, #ff8a65 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 36,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        M
      </div>
    ),
    {
      ...size,
    }
  )
}

