// Site-wide constants

export const siteConfig = {
  name: 'My Swag Co',
  description: 'Custom screen printed shirts designed and ordered online. Choose from premium blank t-shirts, upload your artwork or use our AI design generator, get instant pricing, and pay your deposit in minutes. Minimum 24 pieces.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://myswagco.co',
  email: 'hello@myswagco.co',
  hours: 'Mon-Fri 9am-5pm CT',
}

// FAQ data used on homepage and for JSON-LD structured data
export const faqData = [
  { 
    q: "What's the minimum order quantity?", 
    a: "Our minimum order is 24 pieces. This allows us to keep setup costs reasonable while still offering competitive per-piece pricing." 
  },
  { 
    q: "How long does production take?", 
    a: "Most orders ship within ~14 business days after artwork approval. Rush orders may be available—contact us for expedited options." 
  },
  { 
    q: "What file formats do you accept?", 
    a: "We accept PNG, JPG, PDF, AI, EPS, and SVG files. Don't have vector artwork? Our auto-vectorization tool can convert your raster images, or use our AI to generate designs from scratch." 
  },
  { 
    q: "What if I need design changes?", 
    a: "No problem! After you submit your order, our team reviews your artwork. If any changes are needed, we'll work with you until it's perfect—before production begins." 
  },
  { 
    q: "How does payment work?", 
    a: "We require a 50% deposit to start production. The remaining balance is due before shipping. We accept all major credit cards through our secure Stripe checkout." 
  },
  { 
    q: "Can I order multiple shirt colors?", 
    a: "Absolutely! You can mix different garment colors in a single order and allocate sizes across each color however you like." 
  },
]


