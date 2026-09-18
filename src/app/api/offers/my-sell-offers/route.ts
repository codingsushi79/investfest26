import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Listings the user placed, personally or for a firm they manage.
    const managedFirms = await prisma.firm.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });

    const offers = await prisma.sellOffer.findMany({
      where: {
        OR: [
          { sellerId: user.id },
          { firmId: { in: managedFirms.map((firm) => firm.id) } },
        ],
      },
      include: {
        company: {
          select: {
            symbol: true,
            name: true,
          },
        },
        firm: {
          select: { id: true, name: true, slug: true },
        },
        buyOffers: {
          include: {
            buyer: {
              select: {
                username: true,
              },
            },
            firm: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching my sell offers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
