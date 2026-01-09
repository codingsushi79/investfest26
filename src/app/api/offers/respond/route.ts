import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const respondToOfferSchema = z.object({
  buyOfferId: z.string(),
  action: z.enum(['accept', 'decline']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { buyOfferId, action } = respondToOfferSchema.parse(body);

    // Get the buy offer with related data
    const buyOffer = await prisma.buyOffer.findUnique({
      where: { id: buyOfferId },
      include: {
        sellOffer: {
          include: {
            seller: true,
            company: true,
          },
        },
        buyer: true,
      },
    });

    if (!buyOffer || buyOffer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Offer not found or not pending' },
        { status: 400 }
      );
    }

    // Check if current user is the seller of the sell offer
    if (buyOffer.sellOffer.sellerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to respond to this offer' },
        { status: 403 }
      );
    }

    if (action === 'decline') {
      // Simply update the buy offer status to declined
      await prisma.buyOffer.update({
        where: { id: buyOfferId },
        data: { status: 'declined' },
      });

      return NextResponse.json({ message: 'Offer declined' });
    }

    if (action === 'accept') {
      // Start a transaction to handle the trade
      await prisma.$transaction(async (tx) => {
        const requestedShares = buyOffer.shares;
        const listingShares = buyOffer.sellOffer.shares;

        if (requestedShares <= 0) {
          throw new Error('Invalid share quantity on offer');
        }

        if (requestedShares > listingShares) {
          throw new Error('Not enough shares remaining in this listing');
        }

        // Check if buyer still has sufficient balance
        const buyer = await tx.user.findUnique({
          where: { id: buyOffer.buyerId },
          select: { balance: true },
        });

        const totalCost = requestedShares * buyOffer.offeredPrice;
        if (!buyer || buyer.balance < totalCost) {
          throw new Error('Buyer has insufficient balance');
        }

        // Check if seller still has the shares
        const sellerHolding = await tx.holding.findUnique({
          where: {
            userId_companyId: {
              userId: buyOffer.sellOffer.sellerId,
              companyId: buyOffer.sellOffer.companyId,
            },
          },
        });

        if (!sellerHolding || sellerHolding.shares < requestedShares) {
          throw new Error('Seller has insufficient shares');
        }

        // Transfer shares from seller to buyer
        // Update or create buyer's holding
        const buyerHolding = await tx.holding.findUnique({
          where: {
            userId_companyId: {
              userId: buyOffer.buyerId,
              companyId: buyOffer.sellOffer.companyId,
            },
          },
        });

        if (buyerHolding) {
          await tx.holding.update({
            where: {
              userId_companyId: {
                userId: buyOffer.buyerId,
                companyId: buyOffer.sellOffer.companyId,
              },
            },
            data: {
              shares: buyerHolding.shares + requestedShares,
            },
          });
        } else {
          await tx.holding.create({
            data: {
              userId: buyOffer.buyerId,
              companyId: buyOffer.sellOffer.companyId,
              shares: requestedShares,
            },
          });
        }

        // Update seller's holding
        if (sellerHolding.shares === requestedShares) {
          // Remove the holding if all shares are sold
          await tx.holding.delete({
            where: {
              userId_companyId: {
                userId: buyOffer.sellOffer.sellerId,
                companyId: buyOffer.sellOffer.companyId,
              },
            },
          });
        } else {
          // Reduce the shares
          await tx.holding.update({
            where: {
              userId_companyId: {
                userId: buyOffer.sellOffer.sellerId,
                companyId: buyOffer.sellOffer.companyId,
              },
            },
            data: {
              shares: sellerHolding.shares - requestedShares,
            },
          });
        }

        // Transfer money
        await tx.user.update({
          where: { id: buyOffer.buyerId },
          data: {
            balance: buyer.balance - totalCost,
          },
        });

        await tx.user.update({
          where: { id: buyOffer.sellOffer.sellerId },
          data: {
            balance: buyOffer.sellOffer.seller.balance + totalCost,
          },
        });

        // Update buy offer status
        await tx.buyOffer.update({
          where: { id: buyOfferId },
          data: { status: 'accepted' },
        });

        // Update sell offer shares and possibly status
        const remainingShares = listingShares - requestedShares;
        if (remainingShares === 0) {
          await tx.sellOffer.update({
            where: { id: buyOffer.sellOfferId },
            data: {
              status: 'completed',
              completedAt: new Date(),
              shares: 0,
            },
          });

          // Decline all other pending offers on this now-completed sell offer
          await tx.buyOffer.updateMany({
            where: {
              sellOfferId: buyOffer.sellOfferId,
              status: 'pending',
              id: { not: buyOfferId },
            },
            data: { status: 'declined' },
          });
        } else {
          await tx.sellOffer.update({
            where: { id: buyOffer.sellOfferId },
            data: {
              shares: remainingShares,
            },
          });
        }

        // Create transaction records
        await tx.transaction.create({
          data: {
            userId: buyOffer.buyerId,
            companyId: buyOffer.sellOffer.companyId,
            type: 'BUY',
            shares: requestedShares,
            price: buyOffer.offeredPrice,
          },
        });

        await tx.transaction.create({
          data: {
            userId: buyOffer.sellOffer.sellerId,
            companyId: buyOffer.sellOffer.companyId,
            type: 'SELL',
            shares: requestedShares,
            price: buyOffer.offeredPrice,
          },
        });
      });

      return NextResponse.json({ message: 'Offer accepted and trade completed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error responding to offer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
