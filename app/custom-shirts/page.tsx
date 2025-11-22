import Link from 'next/link'

export default function CustomShirtsLanding() {
  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="border-b border-surface-300 bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-black text-primary-600 hover:text-primary-700 transition-colors">
            My Swag Co
          </Link>
        </div>
      </header>

      {/* Hero Section with Tangerine Background */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="absolute inset-0 pattern-grid opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-bold mb-6">
              Professional Screen Printing
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
              Custom Screen Printed Shirts
              <span className="block text-white/90">Designed & Ordered Online</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl font-medium">
              Choose your favorite premium tee, upload your artwork, get instant pricing, 
              and pay your deposit in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/custom-shirts/configure"
                className="inline-block bg-white text-primary-600 text-lg font-black px-10 py-5 rounded-bento-lg transition-all shadow-bento hover:shadow-soft-xl hover:scale-105 duration-200"
              >
                Start Your Order
              </Link>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-bento-lg">
                <span className="text-sm font-bold">Minimum 24 pieces</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-charcoal-400">
            Four simple steps to custom perfection
          </p>
        </div>

        <div className="bento-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <div className="bento-item bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 hover:shadow-soft-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500 text-white rounded-bento text-xl font-black mb-4">
              1
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">Choose Your Garment</h3>
            <p className="text-charcoal-500 leading-relaxed">
              Select from our curated collection of premium blanks
            </p>
          </div>

          <div className="bento-item bg-gradient-to-br from-data-blue/10 to-data-blue/20 border border-data-blue/30 hover:shadow-soft-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-data-blue text-white rounded-bento text-xl font-black mb-4">
              2
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">Configure & Design</h3>
            <p className="text-charcoal-500 leading-relaxed">
              Choose sizes, quantities, colors, and print locations
            </p>
          </div>

          <div className="bento-item bg-gradient-to-br from-data-purple/10 to-data-purple/20 border border-data-purple/30 hover:shadow-soft-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-data-purple text-white rounded-bento text-xl font-black mb-4">
              3
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">Upload Artwork</h3>
            <p className="text-charcoal-500 leading-relaxed">
              Upload your design files or let us create text-based designs
            </p>
          </div>

          <div className="bento-item bg-gradient-to-br from-data-green/10 to-data-green/20 border border-data-green/30 hover:shadow-soft-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-data-green text-white rounded-bento text-xl font-black mb-4">
              4
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">Pay & Approve</h3>
            <p className="text-charcoal-500 leading-relaxed">
              Pay your deposit and we'll handle the rest
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section - Enhanced Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bento-grid grid-cols-1 md:grid-cols-3">
          <div className="bento-item group hover:shadow-soft-lg transition-all duration-200">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-bento-lg flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-200">
              🚀
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">
              Fast Turnaround
            </h3>
            <p className="text-lg text-charcoal-500 leading-relaxed">
              Most orders ship in ~14 business days after art approval
            </p>
            <div className="mt-4 inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
              ~14 days
            </div>
          </div>

          <div className="bento-item group hover:shadow-soft-lg transition-all duration-200">
            <div className="w-16 h-16 bg-gradient-to-br from-data-purple to-data-pink rounded-bento-lg flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-200">
              💎
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">
              Premium Quality
            </h3>
            <p className="text-lg text-charcoal-500 leading-relaxed">
              Top-tier garments and professional screen printing you can trust
            </p>
            <div className="mt-4 inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
              Pro Grade
            </div>
          </div>

          <div className="bento-item group hover:shadow-soft-lg transition-all duration-200">
            <div className="w-16 h-16 bg-gradient-to-br from-data-green to-data-blue rounded-bento-lg flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-200">
              💰
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">
              Instant Pricing
            </h3>
            <p className="text-lg text-charcoal-500 leading-relaxed">
              Know exactly what you'll pay before you commit. No surprises.
            </p>
            <div className="mt-4 inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
              Real-time
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Bento Style */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bento-item bg-gradient-to-br from-charcoal-700 via-charcoal-800 to-charcoal-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-5"></div>
          <div className="relative text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/80 mb-2 font-medium">
              Minimum order: 24 pieces
            </p>
            <p className="text-white/60 mb-8 max-w-2xl mx-auto">
              Start your custom order today and bring your vision to life with professional screen printing
            </p>
            <Link
              href="/custom-shirts/configure"
              className="inline-block bg-primary-500 text-white hover:bg-primary-600 text-lg font-black px-10 py-5 rounded-bento-lg transition-all shadow-bento hover:shadow-soft-xl hover:scale-105 duration-200"
            >
              Start Your Order Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-300 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-charcoal-500">
          <p className="font-medium">&copy; 2025 My Swag Co. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

