import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const processPlaylist = (p) => {
  let totalSeconds = 0;
  if (p.songs) {
    p.songs.forEach(s => {
      const d = s.song?.duration;
      if (d) {
        if (typeof d === 'string' && d.includes(':')) {
           const parts = d.split(':').map(Number);
           if (parts.length === 2) totalSeconds += (parts[0] || 0) * 60 + (parts[1] || 0);
           else if (parts.length === 3) totalSeconds += (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        } else {
           let val = typeof d === 'number' ? d : parseInt(d) || 0;
           if (s.song?.id?.includes('spotify:') || val > 20000) {
             totalSeconds += Math.floor(val / 1000);
           } else {
             totalSeconds += val;
           }
        }
      }
    });
  }
  return {
    ...p,
    totalDurationSeconds: totalSeconds,
    totalTracks: p._count?.songs || 0,
    songs: p.songs ? p.songs.slice(0, 1) : []
  };
};

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownedPlaylists = await prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { songs: true, savedBy: true } },
        songs: {
          orderBy: { addedAt: 'asc' },
          select: { song: { select: { id: true, duration: true, thumbnail: true } } }
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
              select: { song: { select: { id: true, duration: true, thumbnail: true } } }
            }
          }
        }
      },
      orderBy: { savedAt: 'asc' }
    });

    return NextResponse.json({
      owned: ownedPlaylists.map(processPlaylist),
      saved: savedPlaylists.map(sp => processPlaylist(sp.playlist))
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
