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

    // Fetch playlists owned by user, and playlists saved by user
    const ownedPlaylists = await prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { songs: true, savedBy: true } },
        songs: {
          orderBy: { addedAt: 'asc' },
          take: 1,
          select: { song: { select: { id: true, thumbnail: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const savedPlaylists = await prisma.savedPlaylist.findMany({
      where: { userId: session.user.id },
      include: {
        playlist: {
          include: {
            user: { select: { name: true } },
            _count: { select: { songs: true, savedBy: true } },
            songs: {
              orderBy: { addedAt: 'asc' },
              take: 1,
              select: { song: { select: { id: true, thumbnail: true } } }
            }
          }
        }
      },
      orderBy: { savedAt: 'asc' }
    });

    return NextResponse.json({
      owned: ownedPlaylists,
      saved: savedPlaylists.map(sp => sp.playlist)
    });
  } catch (error) {
    console.error('Playlists GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, isPublic, coverImage } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description: description || '',
        isPublic: !!isPublic,
        coverImage: coverImage || null,
        userId: session.user.id,
      }
    });

    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Playlists POST Error:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
