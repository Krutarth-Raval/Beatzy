import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const playlistId = params.id;

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (!playlist.isPublic && playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Cannot save private playlist' }, { status: 403 });
    }

    // Save to user's savedPlaylists
    const saved = await prisma.savedPlaylist.upsert({
      where: {
        userId_playlistId: {
          userId: session.user.id,
          playlistId: playlistId
        }
      },
      update: {},
      create: {
        userId: session.user.id,
        playlistId: playlistId
      }
    });

    return NextResponse.json({ success: true, saved });
  } catch (error) {
    console.error('Playlist Save POST Error:', error);
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const playlistId = params.id;

    await prisma.savedPlaylist.deleteMany({
      where: {
        userId: session.user.id,
        playlistId: playlistId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Playlist Save DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to unsave playlist' }, { status: 500 });
  }
}
