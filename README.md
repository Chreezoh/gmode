# Supabase Auth with Next.js

A Next.js application with Supabase authentication integration. This project demonstrates how to implement user authentication using Supabase in a Next.js application.

## Features

- User registration with email and password
- User login with email and password
- Password reset functionality
- Protected routes for authenticated users
- User session management
- Responsive UI with Tailwind CSS

## Technologies Used

- Next.js 15
- TypeScript
- Supabase for authentication
- Tailwind CSS for styling

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Chreezoh/supabase-auth-nextjs.git
   cd supabase-auth-nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/lib` - Utility functions including Supabase client
- `/src/context` - React context for authentication
- `/src/styles` - Global styles and Tailwind configuration

## Authentication Flow

1. User signs up with email and password
2. User confirms their email (optional in development)
3. User can sign in with their credentials
4. Protected routes check for authentication status
5. User can sign out

## License

MIT