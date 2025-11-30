-- Migration: Add discount fields to pending_orders table
-- These fields store discount information from checkout to apply when order is created

ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);
ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);


