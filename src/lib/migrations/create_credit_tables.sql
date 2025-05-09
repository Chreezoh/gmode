-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies to user_credits table
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their own credit balance
CREATE POLICY "Users can view their own credit balance"
  ON public.user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow service role to manage all credit balances
CREATE POLICY "Service role can manage all credit balances"
  ON public.user_credits
  USING (auth.role() = 'service_role');

-- Create credit_ledger table
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies to credit_ledger table
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their own credit transactions
CREATE POLICY "Users can view their own credit transactions"
  ON public.credit_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow service role to manage all credit transactions
CREATE POLICY "Service role can manage all credit transactions"
  ON public.credit_ledger
  USING (auth.role() = 'service_role');

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS credit_ledger_user_id_idx ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS credit_ledger_created_at_idx ON public.credit_ledger(created_at);

-- Create function to add initial credits to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert initial credits for new user (e.g., 10 credits)
  INSERT INTO public.user_credits (user_id, credits_balance)
  VALUES (NEW.id, 10.00);
  
  -- Record the transaction in the ledger
  INSERT INTO public.credit_ledger (
    user_id, 
    amount, 
    balance_after, 
    description, 
    transaction_type
  )
  VALUES (
    NEW.id, 
    10.00, 
    10.00, 
    'Initial credits for new user', 
    'addition'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to add initial credits to new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
