import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const offers = await prisma.buyOffer.findMany({
      where: {
        buyerId: user.id,
      },
      include: {
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
