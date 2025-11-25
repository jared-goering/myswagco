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
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // Exclude puppeteer from serverless bundles (it won't work on Vercel anyway)
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core'],
  },
  // Webpack configuration for better production builds
  webpack: (config, { isServer }) => {
    // Ignore puppeteer-related warnings on server
    if (isServer) {
      config.externals = [...(config.externals || []), 'puppeteer', 'puppeteer-core']
    }
    return config
  },
}

module.exports = nextConfig

