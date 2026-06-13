import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';

let innertube = null;
async function getInnertube() {
  if (!innertube) {
    innertube = await Innertube.create({ cache: new UniversalCache(false) });
  }
  return innertube;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    const search = await yt.search(query, { type: 'video' });
    
    const videos = search.videos.slice(0, 10).map(v => ({
      id: v.id,
      title: v.title?.text || v.title || 'Unknown Title',
      thumbnail: v.best_thumbnail?.url || v.thumbnails?.[0]?.url || '',
      artist: v.author?.name || 'Unknown',
      duration: v.duration?.text || ''
    }));

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search for music' }, { status: 500 });
  }
}
