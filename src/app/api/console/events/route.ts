import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check if user is operator
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Not authenticated", { status: 401 });
    }

    const opUsername = process.env.OP_USERNAME || "operator";
    if (user.username !== opUsername) {
      return new Response("Operator only", { status: 403 });
    }

    // Initialize last transaction ID
    let lastTransactionId: string | null = null;
    const initLastTx = await prisma.transaction.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    lastTransactionId = initLastTx?.id || null;

    // Create SSE stream with polling
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(
          new TextEncoder().encode(": connected\n\n")
        );

        // Poll for updates every 2 seconds
        const interval = setInterval(async () => {
          try {
            // Check for new transactions
            if (lastTransactionId) {
              const newTransactions = await prisma.transaction.findMany({
                where: {
                  id: { gt: lastTransactionId },
                },
                include: {
                  user: { select: { username: true } },
                  company: { select: { symbol: true, name: true } },
                },
                orderBy: { createdAt: "asc" },
              });

              for (const tx of newTransactions) {
                const message = JSON.stringify({
                  type: "transaction",
                  action: tx.type,
                  username: tx.user.username,
                  symbol: tx.company.symbol,
                  companyName: tx.company.name,
                  shares: tx.shares,
                  price: tx.price,
                  total: tx.shares * tx.price,
                  timestamp: tx.createdAt.toISOString(),
                });
                controller.enqueue(
                  new TextEncoder().encode(`data: ${message}\n\n`)
                );
                lastTransactionId = tx.id;
              }
            } else {
              // First run - just update the ID
              const lastTx = await prisma.transaction.findFirst({
                orderBy: { createdAt: "desc" },
                select: { id: true },
              });
              lastTransactionId = lastTx?.id || null;
            }

            // Check for new price points (in last 5 seconds)
            const fiveSecondsAgo = new Date(Date.now() - 5000);
            const newPrices = await prisma.pricePoint.findMany({
              where: {
                createdAt: { gte: fiveSecondsAgo },
              },
              include: {
                company: { select: { symbol: true, name: true } },
              },
              orderBy: { createdAt: "desc" },
            });

            for (const price of newPrices) {
              const message = JSON.stringify({
                type: "price_update",
                symbol: price.company.symbol,
                companyName: price.company.name,
                label: price.label,
                value: price.value,
                timestamp: price.createdAt.toISOString(),
              });
              controller.enqueue(
                new TextEncoder().encode(`data: ${message}\n\n`)
              );
            }
          } catch (error) {
            console.error("Error polling for updates:", error);
          }
        }, 2000);

        // Clean up on close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(error.message || "Internal server error", {
      status: 500,
    });
  }
}
