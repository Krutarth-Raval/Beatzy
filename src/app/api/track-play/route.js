import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { track, playlistId } = await req.json();

    if (!track || !track.id) {
      return NextResponse.json({ error: 'Track data is required' }, { status: 400 });
    }

    // Upsert the song to ensure it exists in the Song table
    await prisma.song.upsert({
      where: { id: track.id },
      update: {
        title: track.title || track.name || 'Unknown',
        artist: track.artist || track.artists || 'Unknown Artist',
        thumbnail: track.thumbnail || track.coverArt || '',
        duration: track.duration?.toString() || null,
      },
      create: {
        id: track.id,
        title: track.title || track.name || 'Unknown',
        artist: track.artist || track.artists || 'Unknown Artist',
        thumbnail: track.thumbnail || track.coverArt || '',
        duration: track.duration?.toString() || null,
      },
    });

    // Create the PlayHistory record
    const history = await prisma.playHistory.create({
      data: {
        userId: session.user.id,
        songId: track.id,
        playlistId: playlistId || null,
      },
    });

    return NextResponse.json({ success: true, historyId: history.id });
  } catch (error) {
    console.error('Error tracking play:', error);
    return NextResponse.json({ error: 'Failed to track play' }, { status: 500 });
  }
}
