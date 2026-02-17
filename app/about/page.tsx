import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us — Direct Manufacturer Custom Apparel',
  description: 'My Swag Co is a direct manufacturer of custom screen printed apparel. Team of 20, $5M+ operations, based in Wichita, KS. No middlemen — you work with the people making your stuff.',
  keywords: ['about My Swag Co', 'direct manufacturer apparel', 'Montana Shirt Co', 'Homeplace Apparel', 'custom apparel manufacturer'],
  openGraph: {
    title: 'About My Swag Co — Direct Manufacturer Custom Apparel',
    description: 'We own the production. Team of 20, based in Whitefish, MT. No middlemen, no hidden fees.',
    type: 'website',
  },
}

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'My Swag Co',
    url: 'https://myswagco.co',
    description: 'Direct manufacturer of custom screen printed apparel.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Whitefish',
      addressRegion: 'MT',
      addressCountry: 'US',
    },
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      value: 20,
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
        {/* Hero */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[rgb(var(--text-primary))] mb-6">
          We make the shirts.{' '}
          <span className="text-[#ff5722]">Literally.</span>
        </h1>
        <p className="text-lg sm:text-xl text-[rgb(var(--text-secondary))] leading-relaxed max-w-3xl mb-16">
          My Swag Co isn&apos;t a marketplace. We&apos;re not a middleman connecting you with some random print shop.
          We own the production — so when you order custom apparel from us, you&apos;re working directly
          with the people making your stuff.
        </p>

        {/* The Story */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-4">
            The backstory
          </h2>
          <div className="space-y-4 text-[rgb(var(--text-secondary))] leading-relaxed">
            <p>
              My Swag Co is powered by <strong className="text-[rgb(var(--text-primary))]">Montana Shirt Co</strong>,
              a screen printing operation based in Whitefish, Montana, and{' '}
              <strong className="text-[rgb(var(--text-primary))]">Homeplace Apparel</strong>, our partner production
              facility. Together, that&apos;s a team of 20 people and $5M+ in combined operations.
            </p>
            <p>
              We built My Swag Co because ordering custom apparel was way harder than it needed to be.
              The typical process — email a print shop, wait for a quote, go back and forth on proofs,
              hope the final product matches what you imagined — felt stuck in 2005.
            </p>
            <p>
              So we built something better. An online platform where you can configure your order, design
              your artwork (with an AI generator if you want), see transparent pricing, and check out — all
              without waiting on anyone.
            </p>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-6">
            What makes us different
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: 'Direct manufacturer',
                desc: 'No middleman markup. Your order goes straight to our production floor. We control quality from start to finish.',
              },
              {
                title: 'AI design generator',
                desc: 'Don\'t have artwork? Describe what you want and our AI creates it. Professional designs in minutes, not days.',
              },
              {
                title: 'Group Campaigns',
                desc: 'Share a link with your team, everyone picks their size, and it all comes in one order. No spreadsheets required.',
              },
              {
                title: 'Transparent pricing',
                desc: 'See your price as you build your order. No hidden fees, no surprise charges, no "call for a quote."',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-soft)]"
              >
                <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] mb-2">
                  {item.title}
                </h3>
                <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The Numbers */}
        <section className="mb-16">
          <div className="bg-white rounded-[var(--radius-xl)] p-8 sm:p-10 shadow-[var(--shadow-soft)]">
            <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-8 text-center">
              By the numbers
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[
                { value: '20', label: 'Team members' },
                { value: '$5M+', label: 'Combined operations' },
                { value: '24', label: 'Piece minimum' },
                { value: '2', label: 'Production facilities' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl sm:text-4xl font-bold text-[#ff5722]">{stat.value}</div>
                  <div className="text-sm text-[rgb(var(--text-muted))] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-4">
            Where we are
          </h2>
          <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
            Our home base is <strong className="text-[rgb(var(--text-primary))]">Whitefish, Montana</strong> —
            a small mountain town in northwest Montana. It&apos;s not exactly a tech hub, but it&apos;s where we
            make great shirts and live a pretty good life. Montana Shirt Co handles the bulk of our screen
            printing production, with Homeplace Apparel as our partner facility for additional capacity and
            specialty work.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center py-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text-primary))] mb-3">
            Ready to make something?
          </h2>
          <p className="text-[rgb(var(--text-secondary))] mb-6 max-w-xl mx-auto">
            Skip the quote requests and email chains. Configure your order, see your price, and get it done.
          </p>
          <Link
            href="/custom-shirts"
            className="inline-block bg-[#ff5722] text-white font-medium px-8 py-3 rounded-[var(--radius-md)] hover:bg-[#e64a19] transition-colors text-lg"
          >
            Start Your Order
          </Link>
        </section>
      </div>
    </main>
  )
}
