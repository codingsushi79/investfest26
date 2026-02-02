# InvestFest - Redistributable Trading Game

A fully configurable stock trading simulation game built for Vercel. Operators can customize branding, enable/disable features, and set trading parameters to create their own version of the game.

## Features

- **Configurable Branding**: Set custom title and description
- **Feature Toggles**: Enable/disable different game features
- **Flexible Trading**: Configurable sell-to-market percentage and starting balance
- **User Management**: Registration, authentication, and moderator tools
- **Real-time Charts**: Price history with operator-controlled updates
- **Trading System**: Buy/sell at market prices with offer system
- **Leaderboards**: Portfolio value rankings
- **Admin Controls**: Price updates, user management, and event controls

## Configuration

Create `.env.local` with the following variables:

### Required (Server-side only)
```
DATABASE_URL=postgresql://user:password@host:5432/investfest
NEXTAUTH_SECRET=your-random-secret-key-here
```

### Branding (Client-side accessible)
```
NEXT_PUBLIC_APP_TITLE=Your Game Title
NEXT_PUBLIC_APP_DESCRIPTION=Your game description
```

### Trading Settings
```
SELL_TO_MARKET_PERCENTAGE=90        # Percentage users receive when selling (default: 90)
STARTING_BALANCE=1000               # Starting cash for new users (default: 1000)
MAX_TRADING_PERIOD=Y5 Q4           # Maximum trading period (default: Y5 Q4)
```

### Feature Toggles (Server-side)
```
FEATURE_TRADING=true               # Enable/disable trading functionality
FEATURE_LEADERBOARD=true           # Enable/disable leaderboard
FEATURE_PORTFOLIOS=true            # Enable/disable portfolio views
FEATURE_OFFERS=true                # Enable/disable trading offers system
FEATURE_MODERATOR_TOOLS=true       # Enable/disable moderator features
FEATURE_COMPANY_VALUES=true        # Enable/disable company values page
FEATURE_ADMIN_PRICE_UPDATES=true   # Enable/disable admin price updates
FEATURE_USER_PROFILES=true         # Enable/disable user profiles
FEATURE_USER_REGISTRATION=true     # Enable/disable user registration
FEATURE_ANALYTICS=true             # Enable/disable analytics
```

### Feature Toggles (Client-side - NEXT_PUBLIC_ prefix required)
```
NEXT_PUBLIC_FEATURE_TRADING=true    # Client-side access to trading feature toggle
NEXT_PUBLIC_FEATURE_LEADERBOARD=true
NEXT_PUBLIC_FEATURE_PORTFOLIOS=true
NEXT_PUBLIC_FEATURE_OFFERS=true
NEXT_PUBLIC_FEATURE_MODERATOR_TOOLS=true
NEXT_PUBLIC_FEATURE_COMPANY_VALUES=true
NEXT_PUBLIC_FEATURE_ADMIN_PRICE_UPDATES=true
NEXT_PUBLIC_FEATURE_USER_PROFILES=true
NEXT_PUBLIC_FEATURE_USER_REGISTRATION=true
NEXT_PUBLIC_FEATURE_ANALYTICS=true
```

### Authentication
```
OP_USERNAME=operator                # Username for operator/admin access (server-side)
NEXT_PUBLIC_OP_USERNAME=operator    # Same username for client-side access
REQUIRE_EMAIL_VERIFICATION=false   # Require email verification for registration
```

### Security
```
ENABLE_RATE_LIMITING=true          # Enable DDoS protection
MAX_REQUESTS_PER_MINUTE=60         # Rate limiting threshold
```

## Stack

- Next.js App Router + TypeScript + Tailwind (v4)
- Custom authentication (bcrypt, JWT sessions)
- Prisma (PostgreSQL)
- Recharts for price charts
- Zod for configuration validation

## Setup

### Database
```bash
npm install
npx prisma generate
npx prisma migrate dev
```
On first run the app seeds the 8 companies with default quarterly prices.

### Development
```bash
npm run dev
```
Visit `http://localhost:3000` and create an account or sign in.

## Admin Features

### Price Updates
Send an authenticated POST as the operator user to:
```
POST /api/admin/update-prices
[
  { "symbol": "HH", "label": "y2 q1", "value": 125 },
  { "symbol": "DMI", "label": "y2 q1", "value": 132 }
]
```
Prices append as new points and charts/portfolio values update automatically.

### Event Management
The operator can start/end trading events from the dashboard.

### User Management
Moderators can view profiles and manage users (when enabled).

## Pages

- `/` - Dashboard with charts, cash/holdings overview
- `/trade` - Dedicated trading page to buy/sell shares (if enabled)
- `/leaderboard` - Ranking by portfolio value (if enabled)
- `/portfolios` - All accounts' positions and cash (if enabled)
- `/offers` - Trading offers system (if enabled)
- `/company-values` - Company information (if enabled)
- `/moderator/*` - Moderator tools (if enabled)
- `/signin` - Authentication page for login/registration (if enabled)
