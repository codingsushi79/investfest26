import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { assertFeatures } from '@/lib/config';
import { getPartyShares, resolveActingParty } from '@/lib/offer-parties';

const createSellOfferSchema = z.object({
  companyId: z.string(),
  shares: z.number().int().positive(),
  pricePerShare: z.number().positive(),
  /** List on behalf of a firm the caller manages. */
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
    const { companyId, shares, pricePerShare, firmId } =
      createSellOfferSchema.parse(body);

    if (firmId) {
      assertFeatures('firms', 'firmTrading');
    }

    // A firm lists out of its own holdings; a person lists out of theirs.
    const party = await resolveActingParty(prisma, firmId, user);
    const held = await getPartyShares(prisma, party, companyId);

    if (held < shares) {
      return NextResponse.json(
        { error: 'Insufficient shares' },
        { status: 400 }
      );
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 400 }
      );
    }

    // Create the sell offer
    const sellOffer = await prisma.sellOffer.create({
      data: {
        sellerId: user.id,
        firmId: firmId ?? null,
        companyId,
        shares,
        pricePerShare,
      },
      include: {
        seller: {
          select: {
            username: true,
          },
        },
        company: {
          select: {
            symbol: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ offer: sellOffer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating sell offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
