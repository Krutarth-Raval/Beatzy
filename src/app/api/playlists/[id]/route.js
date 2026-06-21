import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, id: true } },
        songs: {
          include: { song: true },
          orderBy: { addedAt: 'asc' }
        },
        _count: { select: { savedBy: true } }
      }
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Check visibility
    if (!playlist.isPublic) {
      if (!session || !session.user || session.user.id !== playlist.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Format songs to match frontend expectation
    const formattedPlaylist = {
      ...playlist,
      tracks: playlist.songs.map(ps => ({
        ...ps.song,
        addedAt: ps.addedAt,
        playlistId: ps.playlistId
      }))
    };
    delete formattedPlaylist.songs;

    return NextResponse.json(formattedPlaylist);
  } catch (error) {
    console.error('Playlist GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.playlist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Playlist DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedData = {};
    if (body.name !== undefined) updatedData.name = body.name.trim() || 'Untitled Playlist';
    if (body.description !== undefined) updatedData.description = body.description;
    if (body.coverImage !== undefined) updatedData.coverImage = body.coverImage;

    const updatedPlaylist = await prisma.playlist.update({
      where: { id },
      data: updatedData
    });

    return NextResponse.json(updatedPlaylist);
  } catch (error) {
    console.error('Playlist PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}
