import { NextResponse } from 'next/server';
import ytSearch from 'yt-search';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const r = await ytSearch(query);
    // Filter to only get videos (songs) and return the top 10
    const videos = r.videos.slice(0, 10).map(v => ({
      id: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      artist: v.author.name,
      duration: v.timestamp
    }));

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search for music' }, { status: 500 });
  }
}
