import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';

let innertube = null;
async function getInnertube() {
  if (!innertube) {
    innertube = await Innertube.create({ cache: new UniversalCache(false) });
  }
  return innertube;
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || (!url.includes('youtube.com/playlist') && !url.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube Playlist URL' }, { status: 400 });
    }

    let listId;
    try {
      const urlObj = new URL(url);
      listId = urlObj.searchParams.get('list');
    } catch (e) {
      return NextResponse.json({ error: 'Malformed URL' }, { status: 400 });
    }

    if (!listId) {
      return NextResponse.json({ error: 'Could not find Playlist ID in URL' }, { status: 400 });
    }

    const yt = await getInnertube();
    const playlist = await yt.getPlaylist(listId);

    if (!playlist || !playlist.items) {
      throw new Error('No tracks found in playlist.');
    }

    const formattedTracks = playlist.items.map(track => ({
      id: track.id,
      name: track.title?.text || track.title || 'Unknown Title',
      artists: track.author?.name || 'Unknown Artist',
    }));

    return NextResponse.json({
      title: playlist.info?.title || 'YouTube Playlist',
      type: 'Playlist',
      coverArt: playlist.info?.thumbnails?.[0]?.url || 'https://www.youtube.com/img/desktop/yt_1200.png',
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('YouTube Playlist extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract YouTube Playlist. Ensure the playlist is public.' }, { status: 500 });
  }
}
