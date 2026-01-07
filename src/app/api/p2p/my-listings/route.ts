import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's P2P listings
    const listings = await prisma.p2PListing.findMany({
      where: {
        sellerId: user.id
      },
      include: {
        buyer: {
          select: {
            username: true
          }
        },
        company: {
          select: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data
    const listingsWithDetails = listings.map(listing => ({
      id: listing.id,
      companySymbol: listing.company.symbol,
      companyName: listing.company.name,
      shares: listing.shares,
      pricePerShare: listing.pricePerShare,
      totalValue: listing.shares * listing.pricePerShare,
      currentMarketPrice: listing.company.prices[0]?.value || 0,
      status: listing.status,
      buyerUsername: listing.buyer?.username,
      createdAt: listing.createdAt,
      completedAt: listing.completedAt
    }));

    return NextResponse.json(listingsWithDetails);
  } catch (error) {
    console.error("Error fetching user's P2P listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
