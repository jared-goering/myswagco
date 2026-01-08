-- Discount Codes Migration
-- Run this in your Supabase SQL editor

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add discount fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Create index for code lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(active);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Public can view active discount codes (for validation)
CREATE POLICY "Public can view active discount codes"
  ON discount_codes FOR SELECT
  TO public
  USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Service role has full access
CREATE POLICY "Service role has full access to discount codes"
  ON discount_codes FOR ALL
  TO service_role
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_discount_codes_updated_at 
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample discount codes for testing
INSERT INTO discount_codes (code, description, discount_type, discount_value, active, expires_at)
VALUES 
  ('WELCOME10', '10% off for new customers', 'percentage', 10.00, true, NULL),
  ('SAVE25', '$25 off orders over $200', 'fixed', 25.00, true, NULL),
  ('SUMMER2024', '15% summer sale discount', 'percentage', 15.00, true, '2024-09-01 00:00:00+00')
ON CONFLICT (code) DO NOTHING;





