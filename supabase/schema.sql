-- My Swag Co Custom Screen Printing - Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App Configuration Table
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  min_order_quantity INTEGER NOT NULL DEFAULT 24,
  max_ink_colors INTEGER NOT NULL DEFAULT 4,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config
INSERT INTO app_config (deposit_percentage, min_order_quantity, max_ink_colors)
VALUES (50.00, 24, 4);

-- Pricing Tiers Table
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER,
  garment_markup_percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_quantity_range CHECK (max_qty IS NULL OR max_qty > min_qty)
);

-- Insert default pricing tiers
INSERT INTO pricing_tiers (name, min_qty, max_qty, garment_markup_percentage) VALUES
  ('Tier 1: 24-47', 24, 47, 50.00),
  ('Tier 2: 48-71', 48, 71, 45.00),
  ('Tier 3: 72-143', 72, 143, 40.00),
  ('Tier 4: 144+', 144, NULL, 35.00);

-- Garments Table
CREATE TABLE garments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  base_cost DECIMAL(10,2) NOT NULL,
  thumbnail_url TEXT,
  available_colors TEXT[] NOT NULL DEFAULT '{}',
  size_range TEXT[] NOT NULL DEFAULT '{}',
  pricing_tier_id UUID REFERENCES pricing_tiers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Print Pricing Table
CREATE TABLE print_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  num_colors INTEGER NOT NULL CHECK (num_colors >= 1 AND num_colors <= 4),
  cost_per_shirt DECIMAL(10,2) NOT NULL,
  setup_fee_per_screen DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, num_colors)
);

-- Insert default print pricing
-- For each tier, define cost per shirt and setup fee for 1-4 colors
WITH tiers AS (
  SELECT id, min_qty FROM pricing_tiers ORDER BY min_qty
)
INSERT INTO print_pricing (tier_id, num_colors, cost_per_shirt, setup_fee_per_screen)
SELECT 
  t.id,
  colors.num,
  CASE 
    WHEN t.min_qty = 24 THEN colors.num * 1.50
    WHEN t.min_qty = 48 THEN colors.num * 1.25
    WHEN t.min_qty = 72 THEN colors.num * 1.00
    ELSE colors.num * 0.75
  END as cost_per_shirt,
  25.00 as setup_fee
FROM tiers t
CROSS JOIN (SELECT generate_series(1, 4) as num) colors;

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer information
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  shipping_address JSONB NOT NULL,
  organization_name VARCHAR(255),
  need_by_date DATE,
  
  -- Garment details
  garment_id UUID REFERENCES garments(id),
  garment_color VARCHAR(100) NOT NULL,
  size_quantities JSONB NOT NULL,
  total_quantity INTEGER NOT NULL,
  
  -- Print configuration
  print_config JSONB NOT NULL,
  
  -- Pricing
  total_cost DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT false,
  balance_due DECIMAL(10,2) NOT NULL,
  
  -- Status and workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending_art_review',
  internal_notes TEXT,
  
  -- Stripe payment info
  stripe_payment_intent_id VARCHAR(255),
  stripe_balance_payment_intent_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN (
    'pending_art_review',
    'art_approved',
    'art_revision_needed',
    'in_production',
    'balance_due',
    'ready_to_ship',
    'completed',
    'cancelled'
  ))
);

-- Artwork Files Table
CREATE TABLE artwork_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  location VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_location CHECK (location IN (
    'front',
    'back',
    'left_chest',
    'right_chest',
    'full_back'
  ))
);

-- Order Activity Log Table (for tracking status changes, notes, etc.)
CREATE TABLE order_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  performed_by VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'status_change',
    'note_added',
    'price_adjustment',
    'email_sent',
    'payment_received'
  ))
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_garments_active ON garments(active);
CREATE INDEX idx_artwork_files_order_id ON artwork_files(order_id);
CREATE INDEX idx_order_activity_order_id ON order_activity(order_id, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_garments_updated_at BEFORE UPDATE ON garments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_pricing_updated_at BEFORE UPDATE ON print_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_activity ENABLE ROW LEVEL SECURITY;

-- Public read access to active garments
CREATE POLICY "Public can view active garments"
  ON garments FOR SELECT
  USING (active = true);

-- Public read access to pricing tiers
CREATE POLICY "Public can view pricing tiers"
  ON pricing_tiers FOR SELECT
  TO public
  USING (true);

-- Public read access to print pricing
CREATE POLICY "Public can view print pricing"
  ON print_pricing FOR SELECT
  TO public
  USING (true);

-- Public read access to app config
CREATE POLICY "Public can view app config"
  ON app_config FOR SELECT
  TO public
  USING (true);

-- Service role has full access (this is your backend API)
CREATE POLICY "Service role has full access to garments"
  ON garments FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to orders"
  ON orders FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to artwork"
  ON artwork_files FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to pricing tiers"
  ON pricing_tiers FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to print pricing"
  ON print_pricing FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to app config"
  ON app_config FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to order activity"
  ON order_activity FOR ALL
  TO service_role
  USING (true);

-- Insert sample garments for testing
INSERT INTO garments (name, brand, description, active, base_cost, available_colors, size_range, pricing_tier_id)
VALUES 
  (
    'Comfort Colors 1717',
    'Comfort Colors',
    'Premium pigment-dyed heavyweight tee with a vintage, worn-in feel. 100% ring-spun cotton.',
    true,
    8.50,
    ARRAY['White', 'Black', 'Navy', 'Grey', 'Crimson', 'Forest Green', 'Butter'],
    ARRAY['S', 'M', 'L', 'XL', '2XL', '3XL'],
    (SELECT id FROM pricing_tiers WHERE name = 'Tier 1: 24-47')
  ),
  (
    'Bella+Canvas 3001',
    'Bella+Canvas',
    'Soft, modern unisex tee made from premium combed ring-spun cotton. Retail fit and feel.',
    true,
    6.75,
    ARRAY['White', 'Black', 'Heather Grey', 'Navy', 'Red', 'Royal Blue', 'Kelly Green'],
    ARRAY['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    (SELECT id FROM pricing_tiers WHERE name = 'Tier 1: 24-47')
  ),
  (
    'AS Colour Staple Tee',
    'AS Colour',
    'Modern fit tee with a soft hand feel. Made from 100% combed cotton (Marl colors are 85% cotton / 15% viscose).',
    true,
    7.25,
    ARRAY['White', 'Black', 'Navy', 'Grey Marle', 'Olive', 'Pale Blue'],
    ARRAY['XS', 'S', 'M', 'L', 'XL', '2XL'],
    (SELECT id FROM pricing_tiers WHERE name = 'Tier 1: 24-47')
  );

