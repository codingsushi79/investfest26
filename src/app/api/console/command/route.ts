import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

// Command handlers
async function handleCommand(command: string) {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  try {
    switch (cmd) {
      case "help":
        return {
          success: true,
          result: `Available commands:

  help                          Show this help message
  users                         List all users
  user <username>               Get user details
  balance <username> <amount>    Set user balance
  companies                     List all companies
  prices <symbol>               Get price history for a company
  update-price <symbol> <label> <value>
                                Add new price point
  holdings <username>           Get user holdings
  transactions <username>       Get user transactions
  stats                         System statistics
  query <sql>                   Execute raw SQL query (use with caution)
  clear                         Clear console (client-side)`,
        };

      case "users":
        const users = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            balance: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        return { success: true, result: users };

      case "user":
        if (!args[0]) {
          return { success: false, result: "Usage: user <username>" };
        }
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: args[0] }, { email: args[0] }],
          },
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            balance: true,
            createdAt: true,
            holdings: {
              select: {
                shares: true,
                company: {
                  select: {
                    symbol: true,
                    name: true,
                  },
                },
              },
            },
            transactions: {
              select: {
                type: true,
                shares: true,
                price: true,
                createdAt: true,
                company: {
                  select: {
                    symbol: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });
        if (!user) {
          return { success: false, result: `User not found: ${args[0]}` };
        }
        
        // Format user output with email prominently displayed
        // First show key info as a formatted string, then full details as JSON
        const emailDisplay = user.email || "(no email)";
        const summary = `User: ${user.username}${user.name ? ` (${user.name})` : ''}
Email: ${emailDisplay}
Balance: $${user.balance.toFixed(2)}
Holdings: ${user.holdings.length}
Recent Transactions: ${user.transactions.length}

Full Details:`;
        
        const formattedResult = {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email || null,
          balance: user.balance,
          createdAt: user.createdAt,
          holdings: user.holdings.map((h) => ({
            symbol: h.company.symbol,
            name: h.company.name,
            shares: h.shares,
          })),
          recentTransactions: user.transactions.map((t) => ({
            type: t.type,
            symbol: t.company.symbol,
            shares: t.shares,
            price: t.price,
            createdAt: t.createdAt,
          })),
        };
        
        // Return as string first, then JSON
        return { 
          success: true, 
          result: `${summary}\n${JSON.stringify(formattedResult, null, 2)}`
        };

      case "balance":
        if (args.length < 2) {
          return { success: false, result: "Usage: balance <username> <amount>" };
        }
        const username = args[0];
        const amount = parseFloat(args[1]);
        if (isNaN(amount)) {
          return { success: false, result: "Invalid amount" };
        }
        const userToUpdate = await prisma.user.findFirst({
          where: { username },
        });
        if (!userToUpdate) {
          return { success: false, result: `User not found: ${username}` };
        }
        await prisma.user.update({
          where: { id: userToUpdate.id },
          data: { balance: amount },
        });
        return {
          success: true,
          result: `Updated ${username} balance to $${amount.toFixed(2)}`,
        };

      case "companies":
        const companies = await prisma.company.findMany({
          include: {
            prices: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });
        const companiesWithLatestPrice = companies.map((c) => ({
          symbol: c.symbol,
          name: c.name,
          latestPrice: c.prices[0]?.value || 0,
          priceCount: c.prices.length,
        }));
        return { success: true, result: companiesWithLatestPrice };

      case "prices":
        if (!args[0]) {
          return { success: false, result: "Usage: prices <symbol>" };
        }
        const company = await prisma.company.findUnique({
          where: { symbol: args[0].toUpperCase() },
          include: {
            prices: {
              orderBy: { createdAt: "asc" },
            },
          },
        });
        if (!company) {
          return { success: false, result: `Company not found: ${args[0]}` };
        }
        return {
          success: true,
          result: {
            symbol: company.symbol,
            name: company.name,
            prices: company.prices.map((p) => ({
              label: p.label,
              value: p.value,
              createdAt: p.createdAt,
            })),
          },
        };

      case "update-price":
        if (args.length < 3) {
          return {
            success: false,
            result: "Usage: update-price <symbol> <label> <value>",
          };
        }
        const symbol = args[0].toUpperCase();
        const label = args[1];
        const value = parseFloat(args[2]);
        if (isNaN(value)) {
          return { success: false, result: "Invalid value" };
        }
        const companyForPrice = await prisma.company.findUnique({
          where: { symbol },
        });
        if (!companyForPrice) {
          return { success: false, result: `Company not found: ${symbol}` };
        }
        await prisma.pricePoint.create({
          data: {
            companyId: companyForPrice.id,
            label,
            value,
          },
        });
        return {
          success: true,
          result: `Added price point: ${symbol} ${label} = $${value.toFixed(2)}`,
        };

      case "holdings":
        if (!args[0]) {
          return { success: false, result: "Usage: holdings <username>" };
        }
        const userForHoldings = await prisma.user.findFirst({
          where: { username: args[0] },
        });
        if (!userForHoldings) {
          return { success: false, result: `User not found: ${args[0]}` };
        }
        const holdings = await prisma.holding.findMany({
          where: { userId: userForHoldings.id },
          include: {
            company: {
              include: {
                prices: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        });
        const holdingsWithValue = holdings.map((h) => ({
          symbol: h.company.symbol,
          name: h.company.name,
          shares: h.shares,
          latestPrice: h.company.prices[0]?.value || 0,
          totalValue: h.shares * (h.company.prices[0]?.value || 0),
        }));
        return { success: true, result: holdingsWithValue };

      case "transactions":
        if (!args[0]) {
          return { success: false, result: "Usage: transactions <username>" };
        }
        const userForTransactions = await prisma.user.findFirst({
          where: { username: args[0] },
        });
        if (!userForTransactions) {
          return { success: false, result: `User not found: ${args[0]}` };
        }
        const transactions = await prisma.transaction.findMany({
          where: { userId: userForTransactions.id },
          include: {
            company: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return {
          success: true,
          result: transactions.map((t) => ({
            type: t.type,
            symbol: t.company.symbol,
            shares: t.shares,
            price: t.price,
            total: t.shares * t.price,
            createdAt: t.createdAt,
          })),
        };

      case "stats":
        const userCount = await prisma.user.count();
        const companyCount = await prisma.company.count();
        const transactionCount = await prisma.transaction.count();
        const totalBalance = await prisma.user.aggregate({
          _sum: { balance: true },
        });
        return {
          success: true,
          result: {
            users: userCount,
            companies: companyCount,
            transactions: transactionCount,
            totalBalance: totalBalance._sum.balance || 0,
          },
        };

      case "query":
        if (!args.length) {
          return { success: false, result: "Usage: query <sql>" };
        }
        const sql = args.join(" ");
        // Use Prisma's raw query - be careful!
        const result = await prisma.$queryRawUnsafe(sql);
        return { success: true, result: result };

      case "clear":
        return {
          success: true,
          result: "Console cleared (this is handled client-side)",
        };

      default:
        return {
          success: false,
          result: `Unknown command: ${cmd}. Type 'help' for available commands.`,
        };
    }
  } catch (error: any) {
    return { success: false, result: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is operator
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const opUsername = process.env.OP_USERNAME || "operator";
    if (user.username !== opUsername) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const { command } = await request.json();
    if (!command) {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 }
      );
    }

    const result = await handleCommand(command);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

