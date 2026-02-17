import { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAllPosts } from './blog/posts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://myswagco.co'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/custom-shirts`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/custom-shirts/configure`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
  
  // Fetch garments for dynamic pages
  let garmentPages: MetadataRoute.Sitemap = []
  
  try {
    const { data: garments, error } = await supabaseAdmin
      .from('garments')
      .select('id, updated_at')
      .eq('is_active', true)
    
    if (!error && garments) {
      garmentPages = garments.map((garment) => ({
        url: `${baseUrl}/custom-shirts/configure/${garment.id}`,
        lastModified: garment.updated_at ? new Date(garment.updated_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error('Error fetching garments for sitemap:', error)
  }
  
  // About page
  const aboutPage: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // Blog pages
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...getAllPosts().map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  return [...staticPages, ...aboutPage, ...blogPages, ...garmentPages]
}





