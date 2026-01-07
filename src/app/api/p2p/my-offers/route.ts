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

    // Get all offers made by the user
    const offers = await prisma.p2POffer.findMany({
      where: { offererId: user.id },
      include: {
        listing: {
          include: {
            company: true,
            seller: {
              select: { username: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(offers.map(offer => ({
      id: offer.id,
      offeredPrice: offer.offeredPrice,
      totalValue: offer.offeredPrice * offer.listing.shares,
      status: offer.status,
      createdAt: offer.createdAt,
      listing: {
        id: offer.listing.id,
        shares: offer.listing.shares,
        companySymbol: offer.listing.company.symbol,
        companyName: offer.listing.company.name,
        sellerUsername: offer.listing.seller.username,
        listingPrice: offer.listing.pricePerShare
      }
    })));
  } catch (error) {
    console.error("Error fetching user's offers:", error);
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}
