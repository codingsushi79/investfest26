import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

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

    const { input } = await request.json();
    if (!input || typeof input !== "string") {
      return NextResponse.json({ suggestions: [] });
    }

    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const currentArg = parts[parts.length - 1] || "";

    const suggestions: string[] = [];

    // Command autocomplete
    if (parts.length === 1) {
      const commands = [
        "help",
        "users",
        "user",
        "balance",
        "companies",
        "prices",
        "update-price",
        "holdings",
        "transactions",
        "stats",
        "query",
        "clear",
      ];
      suggestions.push(
        ...commands.filter((c) => c.startsWith(cmd)).map((c) => c + " ")
      );
    }
    // Argument autocomplete
    else {
      switch (cmd) {
        case "user":
        case "balance":
        case "holdings":
        case "transactions":
          // Autocomplete usernames
          const users = await prisma.user.findMany({
            where: {
              username: {
                contains: currentArg,
                mode: "insensitive",
              },
            },
            select: { username: true },
            take: 10,
          });
          suggestions.push(...users.map((u) => u.username));
          break;

        case "prices":
        case "update-price":
          // Autocomplete company symbols
          const companies = await prisma.company.findMany({
            where: {
              symbol: {
                contains: currentArg.toUpperCase(),
                mode: "insensitive",
              },
            },
            select: { symbol: true },
            take: 10,
          });
          suggestions.push(...companies.map((c) => c.symbol));
          break;
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

