-- Order Drafts Migration
-- Run this in your Supabase SQL editor after the customers migration

-- Order Drafts Table (stores in-progress orders for authenticated users)
CREATE TABLE order_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Draft identification
  name VARCHAR(255), -- User-friendly name like "Blue T-Shirt Draft"
  
  -- Garment selection
  garment_id UUID REFERENCES garments(id) ON DELETE SET NULL,
  selected_colors TEXT[] NOT NULL DEFAULT '{}',
  
  -- Size and quantities (multi-color support)
  color_size_quantities JSONB NOT NULL DEFAULT '{}',
  
  -- Print configuration
  print_config JSONB NOT NULL DEFAULT '{"locations": {}}',
  
  -- Artwork references and transforms
  artwork_file_records JSONB DEFAULT '{}',
  artwork_transforms JSONB DEFAULT '{}',
  vectorized_svg_data JSONB DEFAULT '{}',
  
  -- Customer info (partial, for when they've started filling it in)
  customer_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  organization_name VARCHAR(255),
  need_by_date DATE,
  shipping_address JSONB,
  
  -- Quote snapshot (if calculated)
  quote JSONB,
  
  -- Text description for artwork
  text_description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_order_drafts_customer_id ON order_drafts(customer_id);
CREATE INDEX idx_order_drafts_updated_at ON order_drafts(updated_at DESC);
CREATE INDEX idx_order_drafts_garment_id ON order_drafts(garment_id);

-- Apply updated_at trigger
CREATE TRIGGER update_order_drafts_updated_at BEFORE UPDATE ON order_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE order_drafts ENABLE ROW LEVEL SECURITY;

-- Customers can view their own drafts
CREATE POLICY "Customers can view own drafts"
  ON order_drafts FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Customers can create drafts
CREATE POLICY "Customers can create drafts"
  ON order_drafts FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own drafts
CREATE POLICY "Customers can update own drafts"
  ON order_drafts FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid());

-- Customers can delete their own drafts
CREATE POLICY "Customers can delete own drafts"
  ON order_drafts FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role has full access to order_drafts"
  ON order_drafts FOR ALL
  TO service_role
  USING (true);

