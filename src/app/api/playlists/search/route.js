import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Search for public playlists matching the query, optionally ignoring current user's own playlists
    // (though sometimes users might want to search their own, we'll exclude them to avoid cluttering with their own which they see in sidebar)
    
    const playlists = await prisma.playlist.findMany({
      where: {
        isPublic: true,
        userId: {
          not: session.user.id
        },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            songs: true,
            savedBy: true
          }
        }
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(playlists);
  } catch (error) {
    console.error('Playlist Search GET Error:', error);
    return NextResponse.json({ error: 'Failed to search playlists' }, { status: 500 });
  }
}
