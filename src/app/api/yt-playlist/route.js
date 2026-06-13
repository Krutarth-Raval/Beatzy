import { NextResponse } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || (!url.includes('youtube.com/playlist') && !url.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube Playlist URL' }, { status: 400 });
    }

    const data = await youtubedl(url, {
      dumpSingleJson: true,
      flatPlaylist: true,
    });

    if (!data || !data.entries) {
      throw new Error('No tracks found in playlist.');
    }

    const formattedTracks = data.entries.map((track) => ({
      id: track.id,
      name: track.title || 'Unknown Title',
      artists: track.uploader || 'Unknown Artist',
    }));

    return NextResponse.json({
      title: data.title || 'YouTube Playlist',
      type: 'Playlist',
      coverArt: 'https://www.youtube.com/img/desktop/yt_1200.png', // Generic fallback
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('YouTube Playlist extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract YouTube Playlist.' }, { status: 500 });
  }
}
