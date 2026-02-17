import { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from './posts'

export const metadata: Metadata = {
  title: 'Blog — Custom Apparel Tips & Guides',
  description: 'Practical guides on custom apparel, screen printing, AI design tools, and ordering team merch. From the people who actually make the shirts.',
  keywords: ['custom apparel blog', 'screen printing tips', 'AI t-shirt design', 'custom merch guide'],
  openGraph: {
    title: 'Blog — My Swag Co',
    description: 'Practical guides on custom apparel, screen printing, AI design tools, and ordering team merch.',
    type: 'website',
  },
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <main className="min-h-screen bg-[rgb(var(--background-start-rgb))]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/"
            className="text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            ← Back to My Swag Co
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text-primary))] mb-3">
          Blog
        </h1>
        <p className="text-lg text-[rgb(var(--text-secondary))] mb-12">
          Practical guides on custom apparel — from the people who make the shirts.
        </p>

        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-white rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft-md)] transition-shadow"
            >
              <Link href={`/blog/${post.slug}`}>
                <time className="text-sm text-[rgb(var(--text-muted))]">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <h2 className="text-xl sm:text-2xl font-semibold text-[rgb(var(--text-primary))] mt-1 mb-2 hover:text-[#ff5722] transition-colors">
                  {post.title}
                </h2>
                <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
                  {post.description}
                </p>
                <span className="inline-block mt-3 text-sm font-medium text-[#ff5722]">
                  Read more · {post.readTime}
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
