# Environment Variables Guide

This document provides a comprehensive guide to environment variables used in the project.

## Overview

Environment variables are used to store configuration settings and secrets that should not be hardcoded in the application code. This includes API keys, database credentials, and other sensitive information.

## Environment Files

The project uses the following environment files:

- `.env.local`: Local development environment variables (not committed to version control)
- `.env.example`: Example environment file with placeholder values (committed to version control)
- `.env.test`: Environment variables for testing (committed to version control)
- `.env.production`: Production environment variables (not committed to version control)

## Required Environment Variables

### Supabase Configuration

| Variable | Description | Access | Required |
|----------|-------------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client & Server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key for client-side operations | Client & Server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin operations | Server Only | Yes |

### Stripe Configuration

| Variable | Description | Access | Required |
|----------|-------------|--------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | Server Only | Yes |
| `STRIPE_WEBHOOK_SECRET` | Secret for validating Stripe webhook events | Server Only | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Stripe publishable key for client-side operations | Client & Server | Yes |

### OpenAI Configuration

| Variable | Description | Access | Required |
|----------|-------------|--------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Server Only | Yes |
| `OPENAI_API_ENDPOINT` | OpenAI API endpoint (defaults to https://api.openai.com/v1) | Server Only | No |

### Search API Configuration

| Variable | Description | Access | Required |
|----------|-------------|--------|----------|
| `BING_SEARCH_API_KEY` | Bing Search API key | Server Only | No |
| `BING_SEARCH_ENDPOINT` | Bing Search API endpoint | Server Only | No |
| `GOOGLE_SEARCH_API_KEY` | Google Search API key | Server Only | No |
| `GOOGLE_SEARCH_ENGINE_ID` | Google Search Engine ID | Server Only | No |

### Application Configuration

| Variable | Description | Access | Required |
|----------|-------------|--------|----------|
| `NEXT_PUBLIC_APP_URL` | Application URL (defaults to http://localhost:3000) | Client & Server | No |
| `NODE_ENV` | Environment mode (development, production, test) | Server Only | No |

## Usage in Code

Environment variables are centralized in the `src/lib/config/env.ts` module, which provides:

1. Type-safe access to environment variables
2. Validation to ensure required variables are present
3. Default values for optional variables
4. Error handling for missing variables

Example usage:

```typescript
// Import environment variables from the centralized module
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/env';

// Use the variables with confidence that they are validated
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

## Client-Side vs. Server-Side Variables

- Variables prefixed with `NEXT_PUBLIC_` are accessible in both client-side and server-side code.
- Variables without the `NEXT_PUBLIC_` prefix are only accessible in server-side code.

## Setting Up Environment Variables

1. Copy the `.env.example` file to `.env.local`
2. Fill in the values for each environment variable
3. Restart the development server to apply the changes

## Environment Variables in Production

For production deployments:

1. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
2. Ensure all required variables are set
3. Use environment variable encryption if available

## Environment Variables in CI/CD

For CI/CD pipelines:

1. Store secrets in your CI/CD platform's secrets manager
2. Reference these secrets in your CI/CD configuration
3. Never print environment variables in logs

## Troubleshooting

If you encounter issues with environment variables:

1. Check that all required variables are set
2. Verify that the values are correct
3. Restart the development server after making changes
4. Check for typos in variable names

## Security Best Practices

1. Never commit `.env.local` or any file containing real secrets to version control
2. Rotate API keys and secrets regularly
3. Use different API keys for development and production
4. Limit access to production secrets to only those who need them
