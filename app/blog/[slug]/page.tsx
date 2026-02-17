import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '../posts'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  // Simple markdown-like rendering for the content
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n')
    const elements: React.ReactNode[] = []
    let inTable = false
    let tableRows: string[][] = []
    let isHeaderRow = true

    const flushTable = () => {
      if (tableRows.length === 0) return
      const headerRow = tableRows[0]
      const bodyRows = tableRows.slice(1)
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {headerRow.map((cell, i) => (
                  <th key={i} className="text-left py-2 px-3 font-semibold text-[rgb(var(--text-primary))]">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 px-3 text-[rgb(var(--text-secondary))]">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      isHeaderRow = true
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Table detection
      if (line.trim().startsWith('|')) {
        if (line.trim().match(/^\|[\s-|]+\|$/)) {
          // Separator row, skip
          isHeaderRow = false
          continue
        }
        inTable = true
        const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        tableRows.push(cells)
        continue
      } else if (inTable) {
        flushTable()
        inTable = false
      }

      if (line.trim() === '') continue

      // Headings
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-2xl font-bold text-[rgb(var(--text-primary))] mt-10 mb-4">
            {line.slice(3)}
          </h2>
        )
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-xl font-semibold text-[rgb(var(--text-primary))] mt-8 mb-3">
            {line.slice(4)}
          </h3>
        )
      } else if (line.startsWith('- **') || line.startsWith('- ')) {
        elements.push(
          <li key={i} className="text-[rgb(var(--text-secondary))] leading-relaxed ml-4 list-disc mb-1"
            dangerouslySetInnerHTML={{
              __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[rgb(var(--text-primary))]">$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#ff5722] hover:underline">$1</a>'),
            }}
          />
        )
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={i} className="text-[rgb(var(--text-secondary))] leading-relaxed ml-4 list-decimal mb-1"
            dangerouslySetInnerHTML={{
              __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-[rgb(var(--text-primary))]">$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#ff5722] hover:underline">$1</a>'),
            }}
          />
        )
      } else {
        elements.push(
          <p key={i} className="text-[rgb(var(--text-secondary))] leading-relaxed mb-4"
            dangerouslySetInnerHTML={{
              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[rgb(var(--text-primary))]">$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#ff5722] hover:underline">$1</a>'),
            }}
          />
        )
      }
    }

    if (inTable) flushTable()

    return elements
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'My Swag Co',
      url: 'https://myswagco.co',
    },
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--background-start-rgb))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/blog"
            className="text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            ← All Posts
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="mb-10">
          <time className="text-sm text-[rgb(var(--text-muted))]">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <span className="text-sm text-[rgb(var(--text-muted))] mx-2">·</span>
          <span className="text-sm text-[rgb(var(--text-muted))]">{post.readTime}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text-primary))] mt-3">
            {post.title}
          </h1>
        </header>

        <div className="prose-custom">
          {renderContent(post.content)}
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-soft)] text-center">
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] mb-2">
            Ready to get started?
          </h3>
          <p className="text-[rgb(var(--text-secondary))] mb-4">
            Design and order custom apparel — directly from the manufacturer.
          </p>
          <Link
            href="/custom-shirts"
            className="inline-block bg-[#ff5722] text-white font-medium px-6 py-3 rounded-[var(--radius-md)] hover:bg-[#e64a19] transition-colors"
          >
            Start Your Order
          </Link>
        </div>
      </article>
    </main>
  )
}
