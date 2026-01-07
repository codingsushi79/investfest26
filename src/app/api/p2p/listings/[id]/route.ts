import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const listing = await prisma.p2PListing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true
          }
        },
        buyer: {
          select: {
            id: true,
            username: true
          }
        },
        company: {
          select: {
            id: true,
            symbol: true,
            name: true,
            prices: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        }
      }
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: listing.id,
      sellerId: listing.sellerId,
      sellerUsername: listing.seller.username,
      buyerId: listing.buyerId,
      buyerUsername: listing.buyer?.username,
      companyId: listing.companyId,
      companySymbol: listing.company.symbol,
      companyName: listing.company.name,
      shares: listing.shares,
      pricePerShare: listing.pricePerShare,
      totalValue: listing.shares * listing.pricePerShare,
      currentMarketPrice: listing.company.prices[0]?.value || 0,
      status: listing.status,
      createdAt: listing.createdAt,
      completedAt: listing.completedAt
    });
  } catch (error) {
    console.error("Error fetching P2P listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.isPaused || user.isBanned) {
      return NextResponse.json(
        { error: "Account is suspended" },
        { status: 403 }
      );
    }

    // Check for trading ended (can be set via environment variable or header)
    const tradingEnded = request.headers.get("x-trading-ended") === "true" ||
      process.env.TRADING_ENDED === "true";

    if (tradingEnded) {
      return NextResponse.json(
        { error: "Trading has ended" },
        { status: 403 }
      );
    }

    // Get the listing
    const listing = await prisma.p2PListing.findUnique({
      where: { id },
      include: {
        seller: true,
        company: true
      }
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "Listing is not available" },
        { status: 400 }
      );
    }

    if (listing.sellerId === user.id) {
      return NextResponse.json(
        { error: "Cannot buy your own listing" },
        { status: 400 }
      );
    }

    const totalCost = listing.shares * listing.pricePerShare;

    // Check if buyer has enough balance
    if (user.balance < totalCost) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check if seller still has the shares
    const sellerHolding = await prisma.holding.findUnique({
      where: {
        userId_companyId: {
          userId: listing.sellerId,
          companyId: listing.companyId
        }
      }
    });

    if (!sellerHolding || sellerHolding.shares < listing.shares) {
      return NextResponse.json(
        { error: "Seller no longer has sufficient shares" },
        { status: 400 }
      );
    }

    // Execute the trade in a transaction
    await prisma.$transaction(async (tx) => {
      // Update listing status
      await tx.p2PListing.update({
        where: { id },
        data: {
          status: "completed",
          buyerId: user.id,
          completedAt: new Date()
        }
      });

      // Transfer money from buyer to seller
      await tx.user.update({
        where: { id: user.id },
        data: { balance: user.balance - totalCost }
      });

      await tx.user.update({
        where: { id: listing.sellerId },
        data: { balance: listing.seller.balance + totalCost }
      });

      // Transfer shares from seller to buyer
      // Update seller's holding
      if (sellerHolding.shares === listing.shares) {
        // Remove the holding if all shares are sold
        await tx.holding.delete({
          where: {
            userId_companyId: {
              userId: listing.sellerId,
              companyId: listing.companyId
            }
          }
        });
      } else {
        // Reduce seller's shares
        await tx.holding.update({
          where: {
            userId_companyId: {
              userId: listing.sellerId,
              companyId: listing.companyId
            }
          },
          data: { shares: sellerHolding.shares - listing.shares }
        });
      }

      // Update or create buyer's holding
      const buyerHolding = await tx.holding.findUnique({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: listing.companyId
          }
        }
      });

      if (buyerHolding) {
        await tx.holding.update({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: listing.companyId
            }
          },
          data: { shares: buyerHolding.shares + listing.shares }
        });
      } else {
        await tx.holding.create({
          data: {
            userId: user.id,
            companyId: listing.companyId,
            shares: listing.shares
          }
        });
      }

      // Record transactions for both parties
      await tx.transaction.create({
        data: {
          userId: user.id,
          companyId: listing.companyId,
          type: "BUY",
          shares: listing.shares,
          price: listing.pricePerShare
        }
      });

      await tx.transaction.create({
        data: {
          userId: listing.sellerId,
          companyId: listing.companyId,
          type: "SELL",
          shares: listing.shares,
          price: listing.pricePerShare
        }
      });
    });

    return NextResponse.json({
      message: "Purchase completed successfully",
      totalCost,
      shares: listing.shares,
      pricePerShare: listing.pricePerShare
    });
  } catch (error) {
    console.error("Error buying P2P listing:", error);
    return NextResponse.json(
      { error: "Failed to complete purchase" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the listing
    const listing = await prisma.p2PListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.sellerId !== user.id) {
      return NextResponse.json(
        { error: "Can only cancel your own listings" },
        { status: 403 }
      );
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "Can only cancel active listings" },
        { status: 400 }
      );
    }

    // Cancel the listing
    await prisma.p2PListing.update({
      where: { id },
      data: {
        status: "cancelled"
      }
    });

    return NextResponse.json({
      message: "Listing cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling P2P listing:", error);
    return NextResponse.json(
      { error: "Failed to cancel listing" },
      { status: 500 }
    );
  }
}
