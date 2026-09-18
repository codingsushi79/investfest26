import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { partyControlledBy, sellerParty } from '@/lib/offer-parties';

const schema = z.object({ sellOfferId: z.string() });

/**
 * Remove a listing outright. Only while it is still active and nobody has bid
 * on it: once a bid is pending there is someone waiting on an answer, and once
 * it has completed the buy offers are the record of a real trade.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sellOfferId } = schema.parse(await request.json());

    const sellOffer = await prisma.sellOffer.findUnique({
      where: { id: sellOfferId },
      include: { buyOffers: true },
    });

    if (!sellOffer) {
      return NextResponse.json({ error: 'Sell offer not found' }, { status: 404 });
    }

    if (!partyControlledBy(sellerParty(sellOffer), user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this offer' },
        { status: 403 }
      );
    }

    if (sellOffer.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active listings can be deleted' },
        { status: 400 }
      );
    }

    const pending = sellOffer.buyOffers.filter((offer) => offer.status === 'pending');
    if (pending.length > 0) {
      return NextResponse.json(
        {
          error: `This listing has ${pending.length} pending offer${
            pending.length === 1 ? '' : 's'
          }. Decline ${pending.length === 1 ? 'it' : 'them'} first, or cancel instead.`,
        },
        { status: 400 }
      );
    }

    // Declined bids go with it; nothing was traded.
    await prisma.sellOffer.delete({ where: { id: sellOfferId } });

    return NextResponse.json({ message: 'Listing deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('Error deleting sell offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
