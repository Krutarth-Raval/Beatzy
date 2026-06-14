import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const take = 20;
    const skip = page * take;

    const history = await prisma.history.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return NextResponse.json({
      items: history,
      hasMore: history.length === take
    });
  } catch (error) {
    console.error('History GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, query, title } = body;

    if (!type || !query || !title) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Always create a new history entry for manual searches


    const newHistory = await prisma.history.create({
      data: {
        userId: session.user.id,
        type,
        query,
        title,
      }
    });

    // Keep history under 50 items per user
    const totalCount = await prisma.history.count({ where: { userId: session.user.id } });
    if (totalCount > 50) {
      const oldest = await prisma.history.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
        take: totalCount - 50,
      });
      await prisma.history.deleteMany({
        where: { id: { in: oldest.map(h => h.id) } }
      });
    }

    return NextResponse.json(newHistory);
  } catch (error) {
    console.error('History POST Error:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Delete single item
      await prisma.history.deleteMany({
        where: { id, userId: session.user.id }
      });
      return NextResponse.json({ success: true, message: 'Item deleted' });
    } else {
      // Delete all history for user
      await prisma.history.deleteMany({
        where: { userId: session.user.id }
      });
      return NextResponse.json({ success: true, message: 'All history cleared' });
    }
  } catch (error) {
    console.error('History DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
