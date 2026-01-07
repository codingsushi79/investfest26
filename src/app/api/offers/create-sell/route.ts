import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSellOfferSchema = z.object({
  companyId: z.string(),
  shares: z.number().int().positive(),
  pricePerShare: z.number().positive(),
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
    const { companyId, shares, pricePerShare } = createSellOfferSchema.parse(body);

    // Check if user has enough shares
    const holding = await prisma.holding.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (!holding || holding.shares < shares) {
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
