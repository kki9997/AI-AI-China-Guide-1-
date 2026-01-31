# replit.md

## Overview

慢慢走 (Slow Walk) is a bilingual mobile-first travel companion app for exploring China. It features an interactive map with tourist spots, AI-powered chat guide using OpenAI, text-to-speech narration, user authentication via Replit Auth, and a tour guide discovery feature to connect with local guides. The app supports English and Chinese language switching throughout the interface.

### Navigation (5 tabs)
- Map (地图) - Interactive map with tourist spots
- Spots (景点) - Browse tourist attractions by category
- Guides (导游) - Find and contact local tour guides
- AI (AI) - AI-powered chat assistant
- Me (我的) - User profile and settings

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, Zustand for client state (language preferences)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with soft sage/mint green travel theme (Jozzy-inspired), CSS variables for theming
- **Typography**: High-contrast serif fonts (Playfair Display, Noto Serif SC) for headings; clean sans-serif (Inter, Noto Sans SC) for body/data
- **Maps**: Leaflet with react-leaflet for interactive mapping
- **Animations**: Framer Motion for page transitions and UI effects

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Build System**: Custom build script using esbuild for server, Vite for client
- **Development**: Hot module replacement via Vite dev server with proxy to Express

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` with models split into `shared/models/`
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Authentication
- **Method**: Replit Auth using OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **User Storage**: Users table with automatic upsert on login
- **Protection**: `isAuthenticated` middleware for protected routes

### Key Design Patterns
- **Shared Types**: TypeScript schemas shared between client and server in `shared/` directory
- **API Contracts**: Route definitions with Zod validation in `shared/routes.ts`
- **Integration Modules**: Reusable AI integrations in `server/replit_integrations/` (auth, chat, image, batch)
- **Component Architecture**: UI primitives in `components/ui/`, feature components at top level

## External Dependencies

### AI Services
- **OpenAI API**: Chat completions via Replit AI Integrations proxy (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **Image Generation**: gpt-image-1 model for AI-generated images

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable

### Authentication
- **Replit OpenID Connect**: Identity provider at `ISSUER_URL` (defaults to https://replit.com/oidc)
- **Session Secret**: `SESSION_SECRET` for signing session cookies

### Frontend CDN Resources
- **Leaflet CSS**: Loaded from unpkg CDN for map styling
- **Google Fonts**: Cinzel, Lato, Noto Sans SC, ZCOOL XiaoWei font families

### Key npm Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Async state management
- `react-leaflet` / `leaflet`: Interactive maps
- `framer-motion`: Animations
- `openid-client` / `passport`: Authentication
- `zustand`: Lightweight state management
- `stripe`: Payment processing

### Booking & Payments
- **Payment Provider**: Stripe (CNY currency)
- **Commission Model**: 5% platform fee on all guide bookings
- **Payment Verification**: Two-path verification
  - Primary: Confirm endpoint validates via Stripe API (session.payment_status)
  - Secondary: Webhook with mandatory signature verification (requires STRIPE_WEBHOOK_SECRET)
- **Booking Flow**: Select guide → Choose date/hours → Stripe checkout → Success page → View in bookings
- **Routes**: `/api/bookings/*` for booking management, `/api/stripe/webhook` for payment events