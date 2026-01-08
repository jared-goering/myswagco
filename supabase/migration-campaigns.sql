-- Group Campaigns Migration
-- Run this in your Supabase SQL editor after the customers migration

-- Campaign Payment Style Type
-- 'organizer_pays' = Organizer pays for everyone at the end
-- 'everyone_pays' = Each participant pays their share at checkout

-- Campaign Status Type
-- 'draft' = Campaign being set up (not yet live)
-- 'active' = Campaign is live and accepting orders
-- 'closed' = Deadline passed, no more orders
-- 'completed' = Order has been placed/fulfilled

-- Campaigns Table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Unique slug for shareable URL (e.g., "spring-2025-soccer")
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Organizer (must be authenticated customer)
  organizer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Campaign details
  name VARCHAR(255) NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_style VARCHAR(20) NOT NULL CHECK (payment_style IN ('organizer_pays', 'everyone_pays')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'completed')),
  
  -- Design configuration snapshot (frozen at campaign creation)
  garment_id UUID NOT NULL REFERENCES garments(id),
  selected_colors TEXT[] NOT NULL DEFAULT '{}',
  print_config JSONB NOT NULL DEFAULT '{"locations": {}}',
  
  -- Artwork snapshot
  artwork_urls JSONB DEFAULT '{}', -- { "front": "url", "back": "url" }
  artwork_transforms JSONB DEFAULT '{}', -- { "front": {...}, "back": {...} }
  
  -- Pricing snapshot (for display to participants)
  price_per_shirt DECIMAL(10,2) NOT NULL,
  
  -- Organizer contact info (for participant emails)
  organizer_name VARCHAR(255),
  organizer_email VARCHAR(255),
  
  -- Optional: order that was placed when campaign closed (for organizer_pays)
  final_order_id UUID REFERENCES orders(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Orders Table (individual participant orders)
CREATE TABLE campaign_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Participant info
  participant_name VARCHAR(255) NOT NULL,
  participant_email VARCHAR(255) NOT NULL,
  
  -- Order details
  size VARCHAR(20) NOT NULL,
  color VARCHAR(100) NOT NULL, -- Which color they selected
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Payment info (only used for 'everyone_pays' campaigns)
  amount_paid DECIMAL(10,2) DEFAULT 0,
  stripe_payment_intent_id VARCHAR(255),
  
  -- Status
  -- 'pending' = Order placed, awaiting payment (or no payment needed)
  -- 'paid' = Payment completed (for everyone_pays)
  -- 'confirmed' = Order confirmed (for organizer_pays, or after payment)
  -- 'cancelled' = Order cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_campaigns_slug ON campaigns(slug);
CREATE INDEX idx_campaigns_organizer_id ON campaigns(organizer_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_deadline ON campaigns(deadline);
CREATE INDEX idx_campaign_orders_campaign_id ON campaign_orders(campaign_id);
CREATE INDEX idx_campaign_orders_status ON campaign_orders(status);
CREATE INDEX idx_campaign_orders_email ON campaign_orders(participant_email);

-- Apply updated_at triggers
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_orders_updated_at BEFORE UPDATE ON campaign_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_orders ENABLE ROW LEVEL SECURITY;

-- Public can view active campaigns (for shareable links)
CREATE POLICY "Public can view active campaigns"
  ON campaigns FOR SELECT
  USING (status IN ('active', 'closed'));

-- Organizers can view all their own campaigns
CREATE POLICY "Organizers can view own campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid());

-- Authenticated users can create campaigns
CREATE POLICY "Authenticated users can create campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid());

-- Organizers can update their own campaigns
CREATE POLICY "Organizers can update own campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid());

-- Organizers can delete their own draft campaigns
CREATE POLICY "Organizers can delete own draft campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid() AND status = 'draft');

-- Public can view campaign orders for active campaigns (order counts)
CREATE POLICY "Public can view campaign order counts"
  ON campaign_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_orders.campaign_id 
      AND campaigns.status IN ('active', 'closed')
    )
  );

-- Organizers can view all orders for their campaigns
CREATE POLICY "Organizers can view orders for own campaigns"
  ON campaign_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_orders.campaign_id 
      AND campaigns.organizer_id = auth.uid()
    )
  );

-- Anyone can create campaign orders for active campaigns
CREATE POLICY "Anyone can create campaign orders"
  ON campaign_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_orders.campaign_id 
      AND campaigns.status = 'active'
    )
  );

-- Participants can update their own orders (by email match)
CREATE POLICY "Participants can update own orders"
  ON campaign_orders FOR UPDATE
  USING (
    participant_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Service role has full access
CREATE POLICY "Service role has full access to campaigns"
  ON campaigns FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to campaign_orders"
  ON campaign_orders FOR ALL
  TO service_role
  USING (true);

-- Helper function to generate unique slug
CREATE OR REPLACE FUNCTION generate_campaign_slug(campaign_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to slug format
  base_slug := lower(regexp_replace(campaign_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug from 1 for 50);
  
  -- Add random suffix for uniqueness
  final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 6);
  
  -- Check if exists and generate new if needed
  WHILE EXISTS (SELECT 1 FROM campaigns WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 6);
    IF counter > 10 THEN
      RAISE EXCEPTION 'Could not generate unique slug';
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;





