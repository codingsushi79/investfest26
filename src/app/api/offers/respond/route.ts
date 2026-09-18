import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  adjustPartyCash,
  buyerParty,
  creditShares,
  debitShares,
  getPartyCash,
  partyControlledBy,
  recordPartyTrade,
  sellerParty,
} from '@/lib/offer-parties';

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

    // Whoever controls the listing answers it: the seller, or the firm's manager.
    const lister = sellerParty(buyOffer.sellOffer);
    if (!partyControlledBy(lister, user.id)) {
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
      await prisma.$transaction(async (tx) => {
        const requestedShares = buyOffer.shares;
        const listingShares = buyOffer.sellOffer.shares;
        const companyId = buyOffer.sellOffer.companyId;
        const symbol = buyOffer.sellOffer.company.symbol;

        if (requestedShares <= 0) {
          throw new Error('Invalid share quantity on offer');
        }

        if (requestedShares > listingShares) {
          throw new Error('Not enough shares remaining in this listing');
        }

        const bidder = buyerParty(buyOffer);
        const totalCost = requestedShares * buyOffer.offeredPrice;

        // Re-check funds inside the transaction: the balance may have moved
        // since the bid was placed.
        const bidderCash = await getPartyCash(tx, bidder);
        if (bidderCash < totalCost) {
          throw new Error('Buyer has insufficient balance');
        }

        // debitShares throws if the seller no longer holds enough.
        await debitShares(tx, lister, companyId, requestedShares);
        await creditShares(tx, bidder, companyId, requestedShares);

        await adjustPartyCash(tx, bidder, -totalCost);
        await adjustPartyCash(tx, lister, totalCost);

        await tx.buyOffer.update({
          where: { id: buyOfferId },
          data: { status: 'accepted' },
        });

        const remainingShares = listingShares - requestedShares;
        if (remainingShares === 0) {
          await tx.sellOffer.update({
            where: { id: buyOffer.sellOfferId },
            data: { status: 'completed', completedAt: new Date(), shares: 0 },
          });

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
            data: { shares: remainingShares },
          });
        }

        await recordPartyTrade(tx, bidder, {
          companyId,
          symbol,
          type: 'BUY',
          shares: requestedShares,
          price: buyOffer.offeredPrice,
        });

        await recordPartyTrade(tx, lister, {
          companyId,
          symbol,
          type: 'SELL',
          shares: requestedShares,
          price: buyOffer.offeredPrice,
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
