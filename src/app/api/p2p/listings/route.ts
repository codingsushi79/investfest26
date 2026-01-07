import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Get all active P2P listings with seller and company info
    const listings = await prisma.p2PListing.findMany({
      where: {
        status: "active"
      },
      include: {
        seller: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to include current market price for comparison
    const listingsWithMarketPrice = listings.map(listing => ({
      id: listing.id,
      sellerId: listing.sellerId,
      sellerUsername: listing.seller.username,
      companyId: listing.companyId,
      companySymbol: listing.company.symbol,
      companyName: listing.company.name,
      shares: listing.shares,
      pricePerShare: listing.pricePerShare,
      totalValue: listing.shares * listing.pricePerShare,
      currentMarketPrice: listing.company.prices[0]?.value || 0,
      discount: listing.company.prices[0] ? ((listing.company.prices[0].value - listing.pricePerShare) / listing.company.prices[0].value) * 100 : 0,
      createdAt: listing.createdAt
    }));

    return NextResponse.json(listingsWithMarketPrice);
  } catch (error) {
    console.error("Error fetching P2P listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Note: Trading ended state is primarily enforced client-side
    // Additional server-side checks can be added here if needed

    const { companyId, shares, pricePerShare } = await request.json();

    // Validate input
    if (!companyId || !shares || !pricePerShare) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (shares <= 0 || pricePerShare <= 0) {
      return NextResponse.json(
        { error: "Shares and price must be positive" },
        { status: 400 }
      );
    }

    // Check if user has enough shares
    const holding = await prisma.holding.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: companyId
        }
      }
    });

    if (!holding || holding.shares < shares) {
      return NextResponse.json(
        { error: "Insufficient shares" },
        { status: 400 }
      );
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Create the P2P listing
    const listing = await prisma.p2PListing.create({
      data: {
        sellerId: user.id,
        companyId: companyId,
        shares: shares,
        pricePerShare: pricePerShare
      },
      include: {
        seller: {
          select: {
            username: true
          }
        },
        company: {
          select: {
            symbol: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      message: "Listing created successfully",
      listing: {
        id: listing.id,
        sellerUsername: listing.seller.username,
        companySymbol: listing.company.symbol,
        companyName: listing.company.name,
        shares: listing.shares,
        pricePerShare: listing.pricePerShare,
        totalValue: listing.shares * listing.pricePerShare,
        createdAt: listing.createdAt
      }
    });
  } catch (error) {
    console.error("Error creating P2P listing:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
