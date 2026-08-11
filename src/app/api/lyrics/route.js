import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let title = searchParams.get('title');
  let artist = searchParams.get('artist');
  const duration = searchParams.get('duration');

  if (!title || !artist) {
    return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
  }

  // Clean up title (remove "Official Video", "Lyric Video", etc.)
  title = title.replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').replace(/official video/i, '').replace(/lyric video/i, '').trim();
  artist = artist.split(',')[0].trim(); // take first artist

  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    if (duration) {
      url += `&duration=${duration}`;
    }

    let response = await fetch(url, {
      headers: { 'User-Agent': 'BeatzyMusicApp/1.0.0' }
    });

    if (response.status === 404) {
      // Try search if exact match fails
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'BeatzyMusicApp/1.0.0' }
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData && searchData.length > 0) {
          const bestMatch = searchData.find(t => t.syncedLyrics) || searchData[0];
          return NextResponse.json(bestMatch);
        }
      }
      return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
    }

    if (!response.ok) {
      throw new Error('Failed to fetch from LRCLIB');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Lyrics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
