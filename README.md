## InvestFest26

Single‑page trading game built for Vercel. Players sign in with Google, start with $1,000, and trade 8 operator-controlled companies whose prices update every 15 minutes. The operator (admin) can change prices in code via an authenticated API.

### Stack
- Next.js App Router + TypeScript + Tailwind (v4)
- NextAuth (Google, database sessions)
- Prisma (PostgreSQL)
- Recharts for price charts

### Environment
Create `.env.local` with:
```
DATABASE_URL=postgresql://user:password@host:5432/investfest
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
ADMIN_EMAIL=operator@example.com   # email that can post price updates
```

### Database
```
npm install
npx prisma migrate dev
```
On first run the app seeds the 8 companies with default quarterly prices.

### Develop
```
npm run dev
```
Visit `http://localhost:3000`.

### Admin price updates (no UI)
Send an authenticated POST (session as `ADMIN_EMAIL`) to:
```
POST /api/admin/update-prices
[
  { "symbol": "HH", "label": "y2 q1", "value": 125 },
  { "symbol": "DMI", "label": "y2 q1", "value": 132 }
]
```
Prices append as new points and charts/portfolio values update automatically.

### Pages
- `/` dashboard with charts, buy/sell, cash/holdings.
- `/leaderboard` ranking by total portfolio value.
- `/portfolios` all accounts’ positions and cash.
