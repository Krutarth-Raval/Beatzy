import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all play history for this month
    const playHistory = await prisma.playHistory.findMany({
      where: {
        userId,
        playedAt: {
          gte: startOfMonth,
        },
      },
      include: {
        song: true,
        playlist: true,
      },
    });

    if (playHistory.length === 0) {
      return NextResponse.json({
        topSongs: [],
        topPlaylist: null,
        topArtists: [],
        totalPlays: 0,
      });
    }

    const songCounts = {};
    const playlistCounts = {};
    const artistCounts = {};

    playHistory.forEach((record) => {
      // Aggregate Songs
      if (record.song) {
        if (!songCounts[record.song.id]) {
          songCounts[record.song.id] = { count: 0, song: record.song };
        }
        songCounts[record.song.id].count++;

        // Aggregate Artists (handle multiple artists if separated by comma)
        const primaryArtist = (record.song.artist || '').split(',')[0].trim();
        if (primaryArtist) {
          if (!artistCounts[primaryArtist]) {
            artistCounts[primaryArtist] = 0;
          }
          artistCounts[primaryArtist]++;
        }
      }

      // Aggregate Playlists
      if (record.playlist) {
        if (!playlistCounts[record.playlist.id]) {
          playlistCounts[record.playlist.id] = { count: 0, playlist: record.playlist };
        }
        playlistCounts[record.playlist.id].count++;
      }
    });

    // Sort and get top 5 songs
    const topSongs = Object.values(songCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({ ...item.song, playCount: item.count }));

    // Get most played playlist
    const sortedPlaylists = Object.values(playlistCounts).sort((a, b) => b.count - a.count);
    const topPlaylist = sortedPlaylists.length > 0 ? { ...sortedPlaylists[0].playlist, playCount: sortedPlaylists[0].count } : null;

    // Get most listened artists (top 3)
    const sortedArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]);
    const topArtists = sortedArtists.slice(0, 3).map(a => ({ name: a[0], playCount: a[1] }));

    return NextResponse.json({
      topSongs,
      topPlaylist,
      topArtists,
      totalPlays: playHistory.length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
