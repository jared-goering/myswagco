import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'My Swag Co - Custom Screen Printing'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ff5722',
          backgroundImage: 'linear-gradient(135deg, #ff5722 0%, #ff8a65 100%)',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px',
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: 'white',
              marginBottom: 20,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            My Swag Co
          </div>
          
          {/* Tagline */}
          <div
            style={{
              fontSize: 36,
              color: 'rgba(255,255,255,0.9)',
              marginBottom: 40,
              fontWeight: 600,
              maxWidth: 800,
            }}
          >
            Custom Screen Printed Shirts
          </div>
          
          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: 40,
              marginTop: 20,
            }}
          >
            {[
              'Premium Quality',
              'AI Design Generator',
              'Instant Pricing',
            ].map((feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '12px 24px',
                  borderRadius: 50,
                  color: 'white',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 20 }}>✓</span>
                {feature}
              </div>
            ))}
          </div>
          
          {/* Bottom tagline */}
          <div
            style={{
              position: 'absolute',
              bottom: 50,
              fontSize: 24,
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 500,
            }}
          >
            Minimum 24 pieces • ~14 day turnaround
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}





