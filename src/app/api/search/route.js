import { NextResponse } from 'next/server';
import play from 'play-dl';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    // Wrap search in an 8-second timeout to prevent Vercel 10s HTML timeout page
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Search timed out')), 8000)
    );

    const searchPromise = play.search(query, { limit: 10 });
    
    const results = await Promise.race([searchPromise, timeoutPromise]);

    const videos = results.map(v => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnails[0]?.url || '',
      artist: v.channel?.name || 'Unknown Artist',
      duration: v.durationRaw
    }));

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Search API error:', error);
    if (error.message === 'Search timed out') {
      return NextResponse.json({ error: 'YouTube search timed out. Try a more specific query.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to search for music' }, { status: 500 });
  }
}
