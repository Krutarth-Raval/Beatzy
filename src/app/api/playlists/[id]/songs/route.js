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

    const resolvedParams = await params;
    const playlistId = resolvedParams.id;
    const songData = await request.json(); // { id, title, artist, thumbnail, duration }

    if (!songData.id || !songData.title) {
      return NextResponse.json({ error: 'Song ID and title are required' }, { status: 400 });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upsert the song to ensure it exists in the Songs table
    await prisma.song.upsert({
      where: { id: songData.id },
      update: {
        title: songData.title,
        artist: songData.artist || 'Unknown',
        thumbnail: songData.thumbnail || '',
        duration: songData.duration || ''
      },
      create: {
        id: songData.id,
        title: songData.title,
        artist: songData.artist || 'Unknown',
        thumbnail: songData.thumbnail || '',
        duration: songData.duration || ''
      }
    });

    // Add to playlist
    const playlistSong = await prisma.playlistSong.upsert({
      where: {
        playlistId_songId: {
          playlistId: playlistId,
          songId: songData.id
        }
      },
      update: {}, // Do nothing if already exists
      create: {
        playlistId: playlistId,
        songId: songData.id
      }
    });

    return NextResponse.json({ success: true, playlistSong });
  } catch (error) {
    console.error('Playlist Song POST Error:', error);
    return NextResponse.json({ error: 'Failed to add song to playlist' }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId: playlistId,
          songId: songId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Playlist Song DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to remove song from playlist' }, { status: 500 });
  }
}
