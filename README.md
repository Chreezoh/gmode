# God Mode (gmode)

A Next.js application with TypeScript, Supabase authentication, and a modular architecture for orchestration, tools, auth, billing, and metrics.

## Features

- User registration with email and password
- User login with email and password
- Password reset functionality
- Protected routes for authenticated users
- User session management
- Responsive UI with Tailwind CSS
- Orchestration engine with GPT-4.1 integration
- Tool registry system for dynamic tool loading
- Conversation memory storage with Row-Level Security
- Credit management and usage tracking
- Stripe integration for payments and subscriptions
- Web search tools with Bing and Google integration

## Technologies Used

- Next.js 15
- TypeScript with strict type-checking
- Supabase for authentication and database
- Tailwind CSS for styling
- OpenAI API for GPT-4.1 integration
- Stripe for payment processing
- Zod for validation
- ESLint and Prettier for code quality

## Project Structure

```
/src
  /app                      # Next.js App Router structure
    /api                    # API routes
      /orchestrate          # Orchestration API endpoint
      /memory               # Memory API endpoints
      /credits              # Credits API endpoint
      /transactions         # Transactions API endpoint
      /usage                # Usage dashboard endpoint
      /stripe               # Stripe integration endpoints
      /cost-estimate        # Cost estimator API
    /auth                   # Auth pages
    /dashboard              # Dashboard pages

  /components               # Reusable UI components
    /auth                   # Authentication-related components
    /dashboard              # Dashboard-related components
    /billing                # Billing-related components
    /ui                     # Generic UI components

  /context                  # React context providers

  /lib                      # Core library code
    /auth                   # Authentication utilities
    /orchestration          # Orchestration engine
    /tools                  # Tool implementations
    /memory                 # Conversation memory
    /billing                # Billing system
    /stripe                 # Stripe integration
    /supabase               # Supabase utilities
    /utils                  # Shared utilities
    /config                 # Configuration
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- A Supabase account and project
- OpenAI API key
- Stripe account (for billing features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Chreezoh/gmode.git
   cd gmode
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   OPENAI_API_KEY=your-openai-api-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your-stripe-public-key
   BING_SEARCH_API_KEY=your-bing-search-api-key
   GOOGLE_SEARCH_API_KEY=your-google-search-api-key
   GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id
   ```

   See [Environment Variables Guide](docs/environment-variables.md) for detailed information about each variable.

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Development

### Local Development with Supabase

For local development without relying on a remote Supabase instance, you can run Supabase locally using Docker. We've provided detailed instructions and a setup script to make this process easier.

1. See [Local Development Setup](LOCAL_DEVELOPMENT.md) for detailed instructions.

2. Run the setup script to automatically configure your local environment:
   ```bash
   ./setup-local-supabase.sh
   ```

This will:
- Install the Supabase CLI if needed
- Initialize a local Supabase instance
- Create all necessary database tables with Row-Level Security
- Generate a sample `.env.local.example` file with your local credentials

### Environment Variables

This project uses environment variables for configuration and secrets management. All environment variables are centralized in `src/lib/config/env.ts`, which provides:

- Type-safe access to environment variables
- Validation to ensure required variables are present
- Default values for optional variables
- Error handling for missing variables

For detailed information, see the [Environment Variables Guide](docs/environment-variables.md).

### Code Style

This project uses ESLint and Prettier for code quality and formatting:

```bash
# Lint the code
npm run lint

# Format the code
npm run format
```

### Testing

```bash
# Run tests
npm test
```

## License

MIT