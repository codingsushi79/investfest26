import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { listingId, offeredPrice } = await request.json();

    // Validate input
    if (!listingId || !offeredPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (offeredPrice <= 0) {
      return NextResponse.json(
        { error: "Offer price must be positive" },
        { status: 400 }
      );
    }

    // Get the listing
    const listing = await prisma.p2PListing.findUnique({
      where: { id: listingId },
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
        { error: "Cannot make offers on your own listings" },
        { status: 400 }
      );
    }

    // Check if user already has a pending offer on this listing
    const existingOffer = await prisma.p2POffer.findFirst({
      where: {
        listingId: listingId,
        offererId: user.id,
        status: "pending"
      }
    });

    if (existingOffer) {
      return NextResponse.json(
        { error: "You already have a pending offer on this listing" },
        { status: 400 }
      );
    }

    // Check if user has enough balance for the offer
    if (user.balance < offeredPrice * listing.shares) {
      return NextResponse.json(
        { error: "Insufficient balance for this offer" },
        { status: 400 }
      );
    }

    // Create the offer
    const offer = await prisma.p2POffer.create({
      data: {
        listingId: listingId,
        offererId: user.id,
        offeredPrice: offeredPrice
      },
      include: {
        listing: {
          include: {
            company: true,
            seller: {
              select: { username: true }
            }
          }
        },
        offerer: {
          select: { username: true }
        }
      }
    });

    return NextResponse.json({
      message: "Offer submitted successfully",
      offer: {
        id: offer.id,
        listingId: offer.listingId,
        offeredPrice: offer.offeredPrice,
        totalValue: offer.offeredPrice * offer.listing.shares,
        status: offer.status,
        createdAt: offer.createdAt,
        companySymbol: offer.listing.company.symbol,
        sellerUsername: offer.listing.seller.username
      }
    });
  } catch (error) {
    console.error("Error creating P2P offer:", error);
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    );
  }
}
