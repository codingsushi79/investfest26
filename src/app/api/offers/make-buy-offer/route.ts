import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { assertFeatures } from '@/lib/config';
import {
  getPartyCash,
  resolveActingParty,
  sameParty,
  sellerParty,
} from '@/lib/offer-parties';

const makeBuyOfferSchema = z.object({
  sellOfferId: z.string(),
  offeredPrice: z.number().positive(),
  shares: z.number().int().positive(),
  /** Bid on behalf of a firm the caller manages. */
  firmId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is paused or banned
    if (user.isPaused || user.isBanned) {
      return NextResponse.json(
        { error: 'Your account is restricted from trading' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sellOfferId, offeredPrice, shares, firmId } =
      makeBuyOfferSchema.parse(body);

    if (firmId) {
      assertFeatures('firms', 'firmTrading');
    }

    // Check if sell offer exists and is active
    const sellOffer = await prisma.sellOffer.findUnique({
      where: { id: sellOfferId },
      include: { seller: true },
    });

    if (!sellOffer || sellOffer.status !== 'active') {
      return NextResponse.json(
        { error: 'Sell offer not found or not available' },
        { status: 400 }
      );
    }

    // Nobody bids against themselves -- including a manager bidding with firm
    // money on that same firm's listing.
    const bidder = await resolveActingParty(prisma, firmId, user);
    const lister = sellerParty(sellOffer);

    if (sameParty(bidder, lister)) {
      return NextResponse.json(
        { error: 'Cannot make offer on your own listing' },
        { status: 400 }
      );
    }

    // Ensure requested shares do not exceed listing
    if (shares > sellOffer.shares) {
      return NextResponse.json(
        { error: 'Cannot request more shares than are listed' },
        { status: 400 }
      );
    }

    // The money comes from whichever side is bidding.
    const totalCost = shares * offeredPrice;
    const available = await getPartyCash(prisma, bidder);
    if (available < totalCost) {
      return NextResponse.json(
        {
          error:
            bidder.kind === 'FIRM'
              ? 'The firm does not have enough cash'
              : 'Insufficient balance',
        },
        { status: 400 }
      );
    }

    // One pending bid per bidder per listing.
    const existingOffer = await prisma.buyOffer.findFirst({
      where: {
        sellOfferId,
        status: 'pending',
        ...(firmId ? { firmId } : { buyerId: user.id, firmId: null }),
      },
    });

    if (existingOffer) {
      return NextResponse.json(
        { error: 'You already have a pending offer on this listing' },
        { status: 400 }
      );
    }

    // Create the buy offer
    const buyOffer = await prisma.buyOffer.create({
      data: {
        sellOfferId,
        buyerId: user.id,
        firmId: firmId ?? null,
        offeredPrice,
        shares,
      },
      include: {
        buyer: {
          select: {
            username: true,
          },
        },
        sellOffer: {
          include: {
            company: {
              select: {
                symbol: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ offer: buyOffer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error making buy offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
