import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get offers made on the user's sell offers
    const offers = await prisma.buyOffer.findMany({
      where: {
        sellOffer: {
          sellerId: user.id,
          status: 'active',
        },
        status: 'pending',
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching buy offers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
