import { NextResponse } from 'next/server';
import play from 'play-dl';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const r = await play.search(query, { limit: 10 });
    
    const videos = r.map(v => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnails[0]?.url || '',
      artist: v.channel?.name || 'Unknown',
      duration: v.durationRaw || ''
    }));

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search for music' }, { status: 500 });
  }
}
