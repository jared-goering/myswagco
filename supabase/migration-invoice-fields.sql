-- Migration: Add invoice, Stripe customer, and tracking fields to orders
-- Run this in your Supabase SQL Editor

-- Add stripe_customer_id to store the Stripe Customer ID for saved payment methods
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add invoice_due_date for tracking when the balance payment is due
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS invoice_due_date DATE;

-- Add invoice_sent_at to track when the invoice email was sent
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP WITH TIME ZONE;

-- Add tracking fields for shipment info
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);

-- Create an index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer_id ON orders(stripe_customer_id);

-- Comment explaining the fields
COMMENT ON COLUMN orders.stripe_customer_id IS 'Stripe Customer ID for saved payment methods';
COMMENT ON COLUMN orders.invoice_due_date IS 'Date when the balance payment is due (typically 30 days after invoice sent)';
COMMENT ON COLUMN orders.invoice_sent_at IS 'Timestamp when the invoice email was sent to the customer';
COMMENT ON COLUMN orders.tracking_number IS 'Shipping tracking number';
COMMENT ON COLUMN orders.carrier IS 'Shipping carrier (UPS, FedEx, USPS, etc.)';

