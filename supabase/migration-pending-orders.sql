-- Migration: Create pending_orders table for storing order data before payment
-- Orders are moved to the orders table only after successful payment

CREATE TABLE IF NOT EXISTS pending_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer information
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  shipping_address JSONB NOT NULL,
  organization_name VARCHAR(255),
  need_by_date DATE,
  
  -- Garment details
  garment_id UUID REFERENCES garments(id),
  color_size_quantities JSONB,
  selected_garments JSONB,
  
  -- Print configuration
  print_config JSONB NOT NULL,
  
  -- Artwork references (uploaded to temp storage)
  artwork_data JSONB,
  
  -- Payment reference
  stripe_payment_intent_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for cleanup and lookup
CREATE INDEX idx_pending_orders_expires_at ON pending_orders(expires_at);
CREATE INDEX idx_pending_orders_payment_intent ON pending_orders(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to pending_orders"
  ON pending_orders FOR ALL
  TO service_role
  USING (true);

-- Cleanup function to delete expired pending orders
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_orders WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;


