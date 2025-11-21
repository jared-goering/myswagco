import Link from 'next/link'

export default function CustomShirtsLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            My Swag Co
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Custom Screen Printed Shirts
            <br />
            <span className="text-primary-600">Designed & Ordered Online</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choose your favorite premium tee, upload your artwork, get instant pricing, 
            and pay your deposit in minutes.
          </p>
          <Link
            href="/custom-shirts/configure"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Start Your Order
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white rounded-xl shadow-sm my-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Garment</h3>
            <p className="text-gray-600">
              Select from our curated collection of premium blanks
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-lg font-semibold mb-2">Configure & Design</h3>
            <p className="text-gray-600">
              Choose sizes, quantities, colors, and print locations
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Artwork</h3>
            <p className="text-gray-600">
              Upload your design files or let us create text-based designs
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              4
            </div>
            <h3 className="text-lg font-semibold mb-2">Pay & Approve</h3>
            <p className="text-gray-600">
              Pay your deposit and we'll handle the rest
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              🚀 Fast Turnaround
            </h3>
            <p className="text-gray-600">
              Most orders ship in ~14 business days after art approval
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              💎 Premium Quality
            </h3>
            <p className="text-gray-600">
              Top-tier garments and professional screen printing
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              💰 Instant Pricing
            </h3>
            <p className="text-gray-600">
              Know exactly what you'll pay before you commit
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-primary-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Minimum order: 24 pieces
          </p>
          <Link
            href="/custom-shirts/configure"
            className="inline-block bg-white text-primary-600 hover:bg-gray-100 text-lg font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg"
          >
            Start Your Order Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>&copy; 2025 My Swag Co. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

