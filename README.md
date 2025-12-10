## InvestFest26

Single‑page trading game built for Vercel. Players create accounts with username/email/password, start with $1,000, and trade 8 operator-controlled companies whose prices update every 15 minutes. The operator (admin) can change prices in code via an authenticated API.

### Stack
- Next.js App Router + TypeScript + Tailwind (v4)
- Custom authentication (bcrypt, JWT sessions)
- Prisma (PostgreSQL)
- Recharts for price charts

### Environment
Create `.env.local` with:
```
DATABASE_URL=postgresql://user:password@host:5432/investfest
JWT_SECRET=your-random-secret-key-here
OP_USERNAME=operator      # username that can post price updates
NEXT_PUBLIC_OP_USERNAME=operator  # same as OP_USERNAME for client-side checks
```

### Database
```
npm install
npx prisma generate
npx prisma migrate dev
```
On first run the app seeds the 8 companies with default quarterly prices.

### Develop
```
npm run dev
```
Visit `http://localhost:3000` and create an account or sign in.

### Admin price updates (no UI)
Send an authenticated POST (session as `OP_EMAIL`) to:
```
POST /api/admin/update-prices
[
  { "symbol": "HH", "label": "y2 q1", "value": 125 },
  { "symbol": "DMI", "label": "y2 q1", "value": 132 }
]
```
Prices append as new points and charts/portfolio values update automatically.

### Pages
- `/` dashboard with charts, cash/holdings overview.
- `/trade` dedicated trading page to buy/sell shares.
- `/leaderboard` ranking by total portfolio value.
- `/portfolios` all accounts' positions and cash with search functionality.
- `/signin` authentication page for login/registration.
