-- Customer Authentication Migration
-- Run this in your Supabase SQL editor after the main schema

-- Customers Table (linked to Supabase auth.users)
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  organization_name VARCHAR(255),
  default_shipping_address JSONB,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Artwork Table
CREATE TABLE saved_artwork (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT, -- For AI-generated artwork, store the prompt used
  is_ai_generated BOOLEAN DEFAULT false,
  metadata JSONB, -- Store additional data like colors detected, dimensions, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id to orders table (nullable for backwards compatibility)
ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_saved_artwork_customer_id ON saved_artwork(customer_id);
CREATE INDEX idx_saved_artwork_created_at ON saved_artwork(created_at DESC);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Apply updated_at triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_artwork_updated_at BEFORE UPDATE ON saved_artwork
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_artwork ENABLE ROW LEVEL SECURITY;

-- Customers can read/update their own profile
CREATE POLICY "Customers can view own profile"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Customers can update own profile"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow inserting customer record on signup (handled by trigger)
CREATE POLICY "Allow customer profile creation"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Saved artwork policies
CREATE POLICY "Customers can view own saved artwork"
  ON saved_artwork FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create saved artwork"
  ON saved_artwork FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own saved artwork"
  ON saved_artwork FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can delete own saved artwork"
  ON saved_artwork FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- Orders policies for customers (they can view their own orders)
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR customer_id IS NULL);

-- Service role has full access
CREATE POLICY "Service role has full access to customers"
  ON customers FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role has full access to saved_artwork"
  ON saved_artwork FOR ALL
  TO service_role
  USING (true);

-- Function to automatically create customer profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create customer profile on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for saved artwork (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('saved-artwork', 'saved-artwork', true);


