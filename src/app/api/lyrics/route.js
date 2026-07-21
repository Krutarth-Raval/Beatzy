import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');

  if (!artist || !title) {
    return NextResponse.json({ error: 'Missing artist or title' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`, {
      headers: {
        'User-Agent': 'BeatzyMusicApp/1.0 (https://github.com/Krutarth-Raval/Beatzy)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ 
        lyrics: data.plainLyrics || null,
        syncedLyrics: data.syncedLyrics || null 
      });
    }

    // Try a simpler search query if exact match fails
    const searchRes = await fetch(`https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`, {
      headers: {
        'User-Agent': 'BeatzyMusicApp/1.0 (https://github.com/Krutarth-Raval/Beatzy)'
      }
    });
    
    if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData && searchData.length > 0) {
            return NextResponse.json({ 
              lyrics: searchData[0].plainLyrics || null,
              syncedLyrics: searchData[0].syncedLyrics || null 
            });
        }
    }

    return NextResponse.json({ lyrics: null });
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}
