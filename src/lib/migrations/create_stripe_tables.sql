-- Add stripe_customer_id to user profiles
ALTER TABLE IF EXISTS auth.users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create stripe_products table to store product information
CREATE TABLE IF NOT EXISTS public.stripe_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_product_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_prices table to store price information
CREATE TABLE IF NOT EXISTS public.stripe_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_price_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT NOT NULL REFERENCES public.stripe_products(stripe_product_id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  unit_amount INTEGER NOT NULL,
  credits_amount INTEGER NOT NULL,
  recurring_interval TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_subscriptions table to store subscription information
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_payment_history table to store payment information
CREATE TABLE IF NOT EXISTS public.stripe_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_method_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies to stripe_products table
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view products
CREATE POLICY "Users can view products"
  ON public.stripe_products
  FOR SELECT
  USING (true);

-- Policy to allow service role to manage products
CREATE POLICY "Service role can manage products"
  ON public.stripe_products
  USING (auth.role() = 'service_role');

-- Add RLS policies to stripe_prices table
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view prices
CREATE POLICY "Users can view prices"
  ON public.stripe_prices
  FOR SELECT
  USING (true);

-- Policy to allow service role to manage prices
CREATE POLICY "Service role can manage prices"
  ON public.stripe_prices
  USING (auth.role() = 'service_role');

-- Add RLS policies to stripe_subscriptions table
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.stripe_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow service role to manage subscriptions
CREATE POLICY "Service role can manage subscriptions"
  ON public.stripe_subscriptions
  USING (auth.role() = 'service_role');

-- Add RLS policies to stripe_payment_history table
ALTER TABLE public.stripe_payment_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own payment history
CREATE POLICY "Users can view their own payment history"
  ON public.stripe_payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow service role to manage payment history
CREATE POLICY "Service role can manage payment history"
  ON public.stripe_payment_history
  USING (auth.role() = 'service_role');

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS stripe_products_active_idx ON public.stripe_products(active);
CREATE INDEX IF NOT EXISTS stripe_prices_active_idx ON public.stripe_prices(active);
CREATE INDEX IF NOT EXISTS stripe_prices_product_id_idx ON public.stripe_prices(stripe_product_id);
CREATE INDEX IF NOT EXISTS stripe_subscriptions_user_id_idx ON public.stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS stripe_payment_history_user_id_idx ON public.stripe_payment_history(user_id);
