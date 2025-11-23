import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-surface-200">
      {/* Hero Section with Tangerine Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
        <div className="absolute inset-0 pattern-dots opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <Image 
                src="/logo.png" 
                alt="My Swag Co" 
                width={400} 
                height={120}
                className="h-24 md:h-32 w-auto drop-shadow-2xl"
                priority
              />
            </div>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-medium">
              Custom screen printed shirts designed and ordered online. Professional quality, instant pricing, friendly experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/custom-shirts"
                className="inline-block bg-white text-primary-600 px-10 py-5 rounded-bento-lg font-black text-lg shadow-bento hover:shadow-soft-xl hover:scale-105 transition-all duration-200"
              >
                Start Custom Order
              </Link>
              <Link
                href="/admin"
                className="inline-block bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-10 py-5 rounded-bento-lg font-bold text-lg hover:bg-white/20 transition-all duration-200"
              >
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
            Why Choose Us
          </h2>
          <p className="text-xl text-charcoal-400 max-w-2xl mx-auto">
            Everything you need for professional custom apparel
          </p>
        </div>

        <div className="bento-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Large Feature Card */}
          <div className="bento-item md:col-span-2 bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="inline-block px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-bold mb-4">
                  Most Popular
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-charcoal-700 mb-4">
                  Instant Pricing Calculator
                </h3>
                <p className="text-lg text-charcoal-500 mb-6">
                  Know exactly what you'll pay before you commit. No hidden fees, no surprises. Configure your order and see pricing update in real-time.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-metric text-primary-600">$24+</div>
                <div className="text-sm text-charcoal-500">
                  <div className="font-bold">Minimum order</div>
                  <div>24 pieces</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fast Turnaround */}
          <div className="bento-item bg-gradient-to-br from-data-blue/10 to-data-blue/20 border border-data-blue/30">
            <div className="w-12 h-12 bg-data-blue rounded-bento flex items-center justify-center text-2xl mb-4">
              🚀
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">
              Fast Turnaround
            </h3>
            <p className="text-charcoal-500">
              Most orders ship in ~14 business days after art approval
            </p>
          </div>

          {/* Premium Quality */}
          <div className="bento-item bg-gradient-to-br from-data-purple/10 to-data-purple/20 border border-data-purple/30">
            <div className="w-12 h-12 bg-data-purple rounded-bento flex items-center justify-center text-2xl mb-4">
              💎
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">
              Premium Quality
            </h3>
            <p className="text-charcoal-500">
              Top-tier garments and professional screen printing you can trust
            </p>
          </div>

          {/* Easy Upload */}
          <div className="bento-item bg-gradient-to-br from-data-green/10 to-data-green/20 border border-data-green/30">
            <div className="w-12 h-12 bg-data-green rounded-bento flex items-center justify-center text-2xl mb-4">
              📤
            </div>
            <h3 className="text-2xl font-black text-charcoal-700 mb-3">
              Easy Upload
            </h3>
            <p className="text-charcoal-500">
              Drag and drop your artwork or let us create text-based designs
            </p>
          </div>

          {/* Secure Payments */}
          <div className="bento-item bg-gradient-to-br from-data-yellow/10 to-data-yellow/20 border border-data-yellow/30 md:col-span-2">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-data-yellow rounded-bento flex items-center justify-center text-2xl flex-shrink-0">
                🔒
              </div>
              <div>
                <h3 className="text-2xl font-black text-charcoal-700 mb-3">
                  Secure Online Payments
                </h3>
                <p className="text-charcoal-500">
                  Pay your deposit online with confidence. We use industry-standard encryption and secure payment processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">
        <div className="bento-item bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Ready to Create?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Start your custom shirt order today and bring your vision to life
          </p>
          <Link
            href="/custom-shirts"
            className="inline-block bg-primary-500 text-white px-10 py-5 rounded-bento-lg font-black text-lg shadow-bento hover:shadow-soft-xl hover:bg-primary-600 hover:scale-105 transition-all duration-200"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-300 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-charcoal-500">
          <p>&copy; 2025 My Swag Co. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}

