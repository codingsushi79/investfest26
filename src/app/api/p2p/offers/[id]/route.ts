import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// Accept an offer
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { action } = await request.json(); // "accept" or "decline"

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the offer with listing and offerer details
    const offer = await prisma.p2POffer.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            seller: true,
            company: true
          }
        },
        offerer: true
      }
    });

    if (!offer) {
      return NextResponse.json(
        { error: "Offer not found" },
        { status: 404 }
      );
    }

    if (offer.listing.sellerId !== user.id) {
      return NextResponse.json(
        { error: "Can only manage offers on your own listings" },
        { status: 403 }
      );
    }

    if (offer.status !== "pending") {
      return NextResponse.json(
        { error: "Offer has already been processed" },
        { status: 400 }
      );
    }

    if (offer.listing.status !== "active") {
      return NextResponse.json(
        { error: "Listing is no longer available" },
        { status: 400 }
      );
    }

    if (action === "accept") {
      // Check if offerer still has enough balance
      const totalCost = offer.offeredPrice * offer.listing.shares;
      if (offer.offerer.balance < totalCost) {
        return NextResponse.json(
          { error: "Offerer no longer has sufficient balance" },
          { status: 400 }
        );
      }

      // Check if seller still has the shares
      const sellerHolding = await prisma.holding.findUnique({
        where: {
          userId_companyId: {
            userId: offer.listing.sellerId,
            companyId: offer.listing.companyId
          }
        }
      });

      if (!sellerHolding || sellerHolding.shares < offer.listing.shares) {
        return NextResponse.json(
          { error: "You no longer have sufficient shares" },
          { status: 400 }
        );
      }

      // Execute the trade in a transaction
      await prisma.$transaction(async (tx) => {
        // Update offer status
        await tx.p2POffer.update({
          where: { id },
          data: { status: "accepted" }
        });

        // Update listing status
        await tx.p2PListing.update({
          where: { id: offer.listing.id },
          data: {
            status: "completed",
            buyerId: offer.offerer.id,
            completedAt: new Date()
          }
        });

        // Decline all other pending offers for this listing
        await tx.p2POffer.updateMany({
          where: {
            listingId: offer.listing.id,
            status: "pending"
          },
          data: { status: "declined" }
        });

        // Transfer money from offerer to seller
        await tx.user.update({
          where: { id: offer.offerer.id },
          data: { balance: offer.offerer.balance - totalCost }
        });

        await tx.user.update({
          where: { id: offer.listing.sellerId },
          data: { balance: offer.listing.seller.balance + totalCost }
        });

        // Transfer shares from seller to offerer
        if (sellerHolding.shares === offer.listing.shares) {
          // Remove the holding if selling all shares
          await tx.holding.delete({
            where: {
              userId_companyId: {
                userId: offer.listing.sellerId,
                companyId: offer.listing.companyId
              }
            }
          });
        } else {
          // Decrement seller's shares
          await tx.holding.update({
            where: {
              userId_companyId: {
                userId: offer.listing.sellerId,
                companyId: offer.listing.companyId
              }
            },
            data: { shares: sellerHolding.shares - offer.listing.shares }
          });
        }

        // Update or create offerer's holding
        const offererHolding = await tx.holding.findUnique({
          where: {
            userId_companyId: {
              userId: offer.offerer.id,
              companyId: offer.listing.companyId
            }
          }
        });

        if (offererHolding) {
          await tx.holding.update({
            where: {
              userId_companyId: {
                userId: offer.offerer.id,
                companyId: offer.listing.companyId
              }
            },
            data: { shares: offererHolding.shares + offer.listing.shares }
          });
        } else {
          await tx.holding.create({
            data: {
              userId: offer.offerer.id,
              companyId: offer.listing.companyId,
              shares: offer.listing.shares
            }
          });
        }

        // Record transactions for both parties
        await tx.transaction.create({
          data: {
            userId: offer.offerer.id,
            companyId: offer.listing.companyId,
            type: "BUY",
            shares: offer.listing.shares,
            price: offer.offeredPrice
          }
        });

        await tx.transaction.create({
          data: {
            userId: offer.listing.sellerId,
            companyId: offer.listing.companyId,
            type: "SELL",
            shares: offer.listing.shares,
            price: offer.offeredPrice
          }
        });
      });

      return NextResponse.json({
        message: "Offer accepted successfully! Trade completed.",
        totalCost,
        shares: offer.listing.shares,
        pricePerShare: offer.offeredPrice
      });
    } else {
      // Decline the offer
      await prisma.p2POffer.update({
        where: { id },
        data: { status: "declined" }
      });

      return NextResponse.json({
        message: "Offer declined successfully"
      });
    }
  } catch (error) {
    console.error("Error processing offer:", error);
    return NextResponse.json(
      { error: "Failed to process offer" },
      { status: 500 }
    );
  }
}
