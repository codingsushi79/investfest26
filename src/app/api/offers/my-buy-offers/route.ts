import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bids the user placed, personally or for a firm they manage.
    const managedFirms = await prisma.firm.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });

    const offers = await prisma.buyOffer.findMany({
      where: {
        OR: [
          { buyerId: user.id },
          { firmId: { in: managedFirms.map((firm) => firm.id) } },
        ],
      },
      include: {
        firm: {
          select: { id: true, name: true, slug: true },
        },
        sellOffer: {
          include: {
            company: {
              select: {
                symbol: true,
                name: true,
              },
            },
            seller: {
              select: {
                username: true,
              },
            },
            firm: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching my buy offers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
