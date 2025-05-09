# Local Development Setup with Supabase

This guide will help you set up a local Supabase instance for development and testing of the gmode application.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18.17 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/get-started) (for running Supabase locally)
- [Git](https://git-scm.com/)

## Setting Up Supabase Locally

### 1. Install Supabase CLI

The Supabase CLI is used to manage your local Supabase instance. Install it globally using npm:

```bash
npm install -g supabase
```

Or using Homebrew (macOS):

```bash
brew install supabase/tap/supabase
```

Verify the installation:

```bash
supabase --version
```

### 2. Initialize Supabase

Create a new directory for your Supabase configuration (if you don't want to use the existing project structure):

```bash
mkdir -p supabase
cd supabase
supabase init
```

This will create a basic Supabase project structure.

### 3. Start Supabase Local Development

Start the local Supabase instance:

```bash
supabase start
```

This command will:
- Pull the necessary Docker images
- Start the Supabase services (PostgreSQL, PostgREST, GoTrue, etc.)
- Create a local database
- Set up authentication
- Provide you with local URLs and keys

When the command completes, you'll see output similar to:

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

Make note of these values as you'll need them to configure your application.

### 4. Set Up Database Schema

Create the necessary database schema for your application. You can do this by creating migration files in the `supabase/migrations` directory.

For the gmode application, we need to create tables for:
- User authentication (handled automatically by Supabase)
- Conversation memory
- Tool configurations
- Usage logs
- Credit management
- Transactions

Create a new migration file:

```bash
cd supabase
mkdir -p migrations
```

Create the following migration files:

**migrations/01_create_memories_table.sql**:
```sql
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
```

**migrations/02_create_tool_configs_table.sql**:
```sql
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
```

**migrations/03_create_usage_tables.sql**:
```sql
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
```

**migrations/04_create_credit_tables.sql**:
```sql
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
```

**migrations/05_create_stripe_tables.sql**:
```sql
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
```

Apply the migrations:

```bash
supabase db reset
```

This will reset your database and apply all migrations.

## Configuring the Application

### 1. Update Environment Variables

Create or update your `.env.local` file with the Supabase local development credentials:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start output>

# Other variables remain the same
OPENAI_API_KEY=your-openai-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your-stripe-public-key
BING_SEARCH_API_KEY=your-bing-search-api-key
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Start the Application

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
```

Your application should now be running at http://localhost:3000 and connected to your local Supabase instance.

## Testing the Setup

### 1. Create a Test User

You can create a test user through the application's signup page or directly through the Supabase Studio:

1. Open the Supabase Studio at http://localhost:54323
2. Go to the Authentication section
3. Click "Add User" and fill in the details

### 2. Test API Endpoints

Use tools like Postman or curl to test your API endpoints:

```bash
# Example: Test the memory API endpoint
curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT token from Supabase>" \
  -d '{"role": "user", "content": "Test message"}'
```

## Troubleshooting

### Common Issues

1. **Docker Issues**: If you encounter problems with Docker, make sure Docker is running and you have sufficient permissions.

2. **Port Conflicts**: If ports are already in use, you can modify the Supabase configuration to use different ports.

3. **Database Connection Issues**: Verify your connection strings and credentials.

4. **JWT Authentication Issues**: Make sure your JWT tokens are valid and not expired.

### Logs and Debugging

- Check Docker logs: `docker logs <container_id>`
- Check Supabase logs: `supabase logs`
- Check Next.js logs in the terminal where you ran `npm run dev`

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)

## Cleaning Up

When you're done with development, you can stop the local Supabase instance:

```bash
supabase stop
```

To completely remove the local Supabase instance and its data:

```bash
supabase stop --no-backup
```
