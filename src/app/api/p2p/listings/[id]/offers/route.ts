import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the user owns this listing
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
        { error: "Can only view offers for your own listings" },
        { status: 403 }
      );
    }

    // Get all offers for this listing
    const offers = await prisma.p2POffer.findMany({
      where: { listingId: id },
      include: {
        offerer: {
          select: {
            id: true,
            username: true
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
      totalValue: offer.offeredPrice * listing.shares,
      status: offer.status,
      createdAt: offer.createdAt,
      offerer: {
        id: offer.offerer.id,
        username: offer.offerer.username
      }
    })));
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}
