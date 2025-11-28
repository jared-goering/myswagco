-- Email Templates Migration
-- Run this in your Supabase SQL editor

-- Create email_templates table (if not exists)
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(50) PRIMARY KEY,
  subject TEXT NOT NULL,
  heading TEXT NOT NULL,
  body_intro TEXT NOT NULL,
  body_details TEXT,
  cta_text TEXT,
  footer_text TEXT,
  header_color VARCHAR(7) DEFAULT '#0284c7',
  estimated_ship_days INTEGER DEFAULT 14,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add estimated_ship_days column if it doesn't exist (for existing tables)
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS estimated_ship_days INTEGER DEFAULT 14;

-- Add order_details_template column for customizing the info box content
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS order_details_template TEXT;

-- Enable RLS (safe to run multiple times)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public can view email templates" ON email_templates;
DROP POLICY IF EXISTS "Service role has full access to email templates" ON email_templates;

-- Public can read email templates (needed for sending emails)
CREATE POLICY "Public can view email templates"
  ON email_templates FOR SELECT
  TO public
  USING (true);

-- Service role has full access
CREATE POLICY "Service role has full access to email templates"
  ON email_templates FOR ALL
  TO service_role
  USING (true);

-- Create updated_at trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at 
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates (or update if they exist)
INSERT INTO email_templates (id, subject, heading, body_intro, body_details, cta_text, footer_text, header_color, estimated_ship_days, order_details_template)
VALUES
  (
    'order_confirmation',
    'Order Confirmation - My Swag Co',
    'Thanks for your order, {{customer_name}}!',
    'Your custom screen printing order has been received and we''re excited to get started!',
    '1. Our team will review your artwork within 1-2 business days.
2. Once approved, your order moves into production.
3. Most orders ship within ~14 business days after art approval.
4. We''ll collect the remaining balance before shipping.',
    NULL,
    'If you have any questions, simply reply to this email.',
    '#0284c7',
    14,
    'Order ID: {{order_id}}
Total Cost: ${{total_cost}}
Deposit Paid: ${{deposit_amount}}
Balance Due: ${{balance_due}}'
  ),
  (
    'art_approved',
    'Artwork Approved - Order Moving to Production!',
    'Great news, {{customer_name}}!',
    'Your artwork has been approved and we''ve moved your order into production!',
    NULL,
    NULL,
    'We''ll send you another email when your order is ready to ship with payment instructions for the remaining balance.',
    '#059669',
    14,
    'Order ID: {{order_id}}
Estimated Ship Date: {{estimated_ship_date}}'
  ),
  (
    'balance_due',
    'Balance Due - Your Order is Ready!',
    'Your order is ready, {{customer_name}}!',
    'Your custom screen printing order is complete and ready to ship! Before we send it out, we need to collect the remaining balance.',
    NULL,
    'Pay Balance Now',
    'Once payment is received, we''ll ship your order right away!',
    '#d97706',
    14,
    'Order ID: {{order_id}}
Balance Due: ${{balance_due}}'
  ),
  (
    'balance_paid',
    'Payment Received - Order Shipping Soon!',
    'Payment Received!',
    'Thanks, {{customer_name}}! We''ve received your final payment and your order is now ready to ship.',
    NULL,
    NULL,
    'We''ll send you tracking information as soon as your order ships!',
    '#059669',
    14,
    'Order ID: {{order_id}}
Amount Paid: ${{amount_paid}}'
  ),
  (
    'art_revision_needed',
    'Artwork Revision Needed - Action Required',
    'Artwork Review Update',
    'Hi {{customer_name}}, we''ve reviewed your artwork and need to discuss a few things before we can proceed with production.',
    NULL,
    NULL,
    'Please reply to this email or give us a call to discuss. We''ll help you get everything sorted out quickly!',
    '#dc2626',
    14,
    'Order ID: {{order_id}}'
  ),
  (
    'shipped',
    'Your Order Has Shipped!',
    'Your order is on its way!',
    'Great news, {{customer_name}}! Your custom screen printing order has shipped and is on its way to you.',
    NULL,
    'Track Your Package',
    'Thank you for your business! We hope you love your custom shirts.',
    '#7c3aed',
    14,
    'Order ID: {{order_id}}
Carrier: {{carrier}}
Tracking Number: {{tracking_number}}'
  )
ON CONFLICT (id) DO UPDATE SET
  estimated_ship_days = COALESCE(email_templates.estimated_ship_days, EXCLUDED.estimated_ship_days),
  order_details_template = COALESCE(email_templates.order_details_template, EXCLUDED.order_details_template);

-- Update any existing records that have null order_details_template with defaults
UPDATE email_templates SET order_details_template = 'Order ID: {{order_id}}
Total Cost: ${{total_cost}}
Deposit Paid: ${{deposit_amount}}
Balance Due: ${{balance_due}}' WHERE id = 'order_confirmation' AND order_details_template IS NULL;

UPDATE email_templates SET order_details_template = 'Order ID: {{order_id}}
Estimated Ship Date: {{estimated_ship_date}}' WHERE id = 'art_approved' AND order_details_template IS NULL;

UPDATE email_templates SET order_details_template = 'Order ID: {{order_id}}
Balance Due: ${{balance_due}}' WHERE id = 'balance_due' AND order_details_template IS NULL;

UPDATE email_templates SET order_details_template = 'Order ID: {{order_id}}
Amount Paid: ${{amount_paid}}' WHERE id = 'balance_paid' AND order_details_template IS NULL;

UPDATE email_templates SET order_details_template = 'Order ID: {{order_id}}' WHERE id = 'art_revision_needed' AND order_details_template IS NULL;

UPDATE email_templates SET order_details_template = 'Order ID: {{order_id}}
Carrier: {{carrier}}
Tracking Number: {{tracking_number}}' WHERE id = 'shipped' AND order_details_template IS NULL;
