#!/bin/bash

# Setup script for local Supabase development environment
# This script will:
# 1. Check for required dependencies
# 2. Initialize Supabase locally
# 3. Create necessary database schema
# 4. Generate a sample .env.local file

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

# Check for Node.js
if ! command_exists node; then
  echo -e "${RED}Node.js is not installed. Please install Node.js v18.17 or later.${NC}"
  exit 1
fi

# Check for npm
if ! command_exists npm; then
  echo -e "${RED}npm is not installed. Please install npm.${NC}"
  exit 1
fi

# Check for Docker
if ! command_exists docker; then
  echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
  exit 1
fi

# Check for Supabase CLI
if ! command_exists supabase; then
  echo -e "${YELLOW}Supabase CLI is not installed. Installing...${NC}"
  
  # Check if Homebrew is available (for macOS)
  if command_exists brew; then
    brew install supabase/tap/supabase
  else
    # Otherwise use npm
    npm install -g supabase
  fi
  
  if ! command_exists supabase; then
    echo -e "${RED}Failed to install Supabase CLI. Please install it manually.${NC}"
    echo -e "${YELLOW}npm install -g supabase${NC} or ${YELLOW}brew install supabase/tap/supabase${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}All dependencies are installed.${NC}"

# Create Supabase directory if it doesn't exist
if [ ! -d "supabase" ]; then
  echo -e "${YELLOW}Creating Supabase directory...${NC}"
  mkdir -p supabase
fi

# Initialize Supabase if not already initialized
if [ ! -f "supabase/config.toml" ]; then
  echo -e "${YELLOW}Initializing Supabase...${NC}"
  cd supabase && supabase init && cd ..
else
  echo -e "${GREEN}Supabase already initialized.${NC}"
fi

# Create migrations directory if it doesn't exist
if [ ! -d "supabase/migrations" ]; then
  echo -e "${YELLOW}Creating migrations directory...${NC}"
  mkdir -p supabase/migrations
fi

# Create migration files
echo -e "${YELLOW}Creating migration files...${NC}"

# Create memories table migration
cat > supabase/migrations/01_create_memories_table.sql << 'EOF'
-- Create memories table with RLS
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own memories
CREATE POLICY "Users can only access their own memories" 
    ON public.memories 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS memories_user_id_timestamp_idx ON public.memories (user_id, timestamp);
EOF

# Create tool_configs table migration
cat > supabase/migrations/02_create_tool_configs_table.sql << 'EOF'
-- Create tool_configs table with RLS
CREATE TABLE IF NOT EXISTS public.tool_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    config_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, tool_name)
);

-- Enable Row Level Security
ALTER TABLE public.tool_configs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own tool configs
CREATE POLICY "Users can only access their own tool configs" 
    ON public.tool_configs 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS tool_configs_user_id_tool_name_idx ON public.tool_configs (user_id, tool_name);
EOF

# Create usage tables migration
cat > supabase/migrations/03_create_usage_tables.sql << 'EOF'
-- Create usage_logs table with RLS
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own usage logs
CREATE POLICY "Users can only access their own usage logs" 
    ON public.usage_logs 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS usage_logs_user_id_timestamp_idx ON public.usage_logs (user_id, timestamp);

-- Create metrics table with RLS
CREATE TABLE IF NOT EXISTS public.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    avg_tokens FLOAT NOT NULL,
    count INTEGER NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, tool_name)
);

-- Enable Row Level Security
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own metrics
CREATE POLICY "Users can only access their own metrics" 
    ON public.metrics 
    FOR ALL 
    USING (auth.uid() = user_id);
EOF

# Create credit tables migration
cat > supabase/migrations/04_create_credit_tables.sql << 'EOF'
-- Create user_credits table with RLS
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance FLOAT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own credits
CREATE POLICY "Users can only access their own credits" 
    ON public.user_credits 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create transactions table with RLS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'deduction', 'refund', 'subscription')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own transactions
CREATE POLICY "Users can only access their own transactions" 
    ON public.transactions 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS transactions_user_id_timestamp_idx ON public.transactions (user_id, timestamp);
EOF

# Create stripe tables migration
cat > supabase/migrations/05_create_stripe_tables.sql << 'EOF'
-- Create stripe_customers table with RLS
CREATE TABLE IF NOT EXISTS public.stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(stripe_customer_id)
);

-- Enable Row Level Security
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own stripe customer info
CREATE POLICY "Users can only access their own stripe customer info" 
    ON public.stripe_customers 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create subscriptions table with RLS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    status TEXT NOT NULL,
    tier TEXT NOT NULL,
    monthly_credits INTEGER NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(stripe_subscription_id)
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own subscriptions
CREATE POLICY "Users can only access their own subscriptions" 
    ON public.subscriptions 
    FOR ALL 
    USING (auth.uid() = user_id);
EOF

echo -e "${GREEN}Migration files created.${NC}"

# Start Supabase
echo -e "${YELLOW}Starting Supabase...${NC}"
supabase start

# Get Supabase credentials
SUPABASE_URL="http://localhost:54321"
ANON_KEY=$(supabase status | grep "anon key:" | awk '{print $3}')
SERVICE_ROLE_KEY=$(supabase status | grep "service_role key:" | awk '{print $3}')

# Create .env.local.example file
echo -e "${YELLOW}Creating .env.local.example file...${NC}"
cat > .env.local.example << EOF
# Supabase Configuration
# Public variables (accessible in browser)
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
# Private variables (server-side only)
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Stripe Configuration
# Private variables (server-side only)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
# Public variables (accessible in browser)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your-stripe-public-key

# OpenAI Configuration
# Private variables (server-side only)
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_ENDPOINT=https://api.openai.com/v1

# Search API Configuration
# Private variables (server-side only)
BING_SEARCH_API_KEY=your-bing-search-api-key
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id

# Application Configuration
# Public variables (accessible in browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Copy .env.local.example to .env.local and fill in your API keys"
echo -e "2. Run ${YELLOW}npm run dev${NC} to start the application"
echo -e "3. Visit http://localhost:3000 to see your application"
echo -e "4. Visit http://localhost:54323 to access Supabase Studio"
echo -e "\nFor more information, see the LOCAL_DEVELOPMENT.md file."
