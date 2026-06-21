import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const playlistId = resolvedParams.id;
    const { tracks } = await request.json(); // Array of songData

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: 'Tracks array is required' }, { status: 400 });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process in batches if necessary, or all at once since it's Prisma
    // First, upsert all songs into the Song table
    // Prisma does not have upsertMany, so we use a transaction
    const upsertSongs = tracks.map(track => {
      const ytId = track.id?.replace('youtube-', '') || track.id;
      return prisma.song.upsert({
        where: { id: ytId },
        update: {
          title: track.title || track.name || 'Unknown Track',
          artist: track.artist || track.author?.name || track.artists || 'Unknown Artist',
          thumbnail: track.thumbnail || track.best_thumbnail?.url || track.thumbnails?.[0]?.url || '',
          duration: String(track.duration || track.duration_string || '')
        },
        create: {
          id: ytId,
          title: track.title || track.name || 'Unknown Track',
          artist: track.artist || track.author?.name || track.artists || 'Unknown Artist',
          thumbnail: track.thumbnail || track.best_thumbnail?.url || track.thumbnails?.[0]?.url || '',
          duration: String(track.duration || track.duration_string || '')
        }
      });
    });

    await prisma.$transaction(upsertSongs);

    // Then, add them to the playlist (createMany skips duplicates)
    // Wait, createMany will throw if there are duplicates inside the DB already
    // We can just query existing songs in the playlist to exclude them
    const existingConnections = await prisma.playlistSong.findMany({
      where: { playlistId },
      select: { songId: true }
    });
    
    const existingIds = new Set(existingConnections.map(c => c.songId));
    
    // Also deduplicate the incoming array of tracks itself
    const uniqueIncomingIds = new Set();
    const newConnections = [];

    tracks.forEach(track => {
      const ytId = track.id?.replace('youtube-', '') || track.id;
      if (!existingIds.has(ytId) && !uniqueIncomingIds.has(ytId)) {
        uniqueIncomingIds.add(ytId);
        newConnections.push({
          playlistId,
          songId: ytId
        });
      }
    });

    if (newConnections.length > 0) {
      await prisma.playlistSong.createMany({
        data: newConnections,
        skipDuplicates: true
      });
    }

    return NextResponse.json({ success: true, added: newConnections.length });
  } catch (error) {
    console.error('Playlist Songs Bulk POST Error:', error);
    return NextResponse.json({ error: 'Failed to add songs to playlist' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const playlistId = resolvedParams.id;
    const { songIds } = await request.json(); // Array of song IDs

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return NextResponse.json({ error: 'songIds array is required' }, { status: 400 });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.playlistSong.deleteMany({
      where: {
        playlistId: playlistId,
        songId: { in: songIds }
      }
    });

    return NextResponse.json({ success: true, deleted: songIds.length });
  } catch (error) {
    console.error('Playlist Songs Bulk DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to remove songs from playlist' }, { status: 500 });
  }
}
