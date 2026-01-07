import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const cancelSellOfferSchema = z.object({
  sellOfferId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sellOfferId } = cancelSellOfferSchema.parse(body);

    // Check if the sell offer exists and belongs to the user
    const sellOffer = await prisma.sellOffer.findUnique({
      where: { id: sellOfferId },
    });

    if (!sellOffer) {
      return NextResponse.json(
        { error: 'Sell offer not found' },
        { status: 400 }
      );
    }

    if (sellOffer.sellerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this offer' },
        { status: 403 }
      );
    }

    if (sellOffer.status !== 'active') {
      return NextResponse.json(
        { error: 'Offer is not active' },
        { status: 400 }
      );
    }

    // Update the sell offer status to cancelled
    await prisma.sellOffer.update({
      where: { id: sellOfferId },
      data: {
        status: 'cancelled',
      },
    });

    // Decline all pending buy offers on this sell offer
    await prisma.buyOffer.updateMany({
      where: {
        sellOfferId,
        status: 'pending',
      },
      data: {
        status: 'declined',
      },
    });

    return NextResponse.json({ message: 'Offer cancelled successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error cancelling sell offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
