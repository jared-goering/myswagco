/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      // AS Colour (BigCommerce)
      {
        protocol: 'https',
        hostname: '**.bigcommerce.com',
      },
      // S&S Activewear CDN
      {
        protocol: 'https',
        hostname: 'cdn.ssactivewear.com',
      },
      {
        protocol: 'https',
        hostname: '**.ssactivewear.com',
      },
      // Other common supplier CDNs
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
}

module.exports = nextConfig

