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
  const type = searchParams.get('type');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    let videos = [];
    
    if (type === 'music') {
      const search = await yt.music.search(query, { type: 'song' });
      videos = (search.songs?.contents || []).slice(0, 10).map(v => ({
        id: v.id,
        title: v.title || 'Unknown Title',
        thumbnail: v.thumbnails?.[0]?.url || '',
        artist: v.artists?.map(a => a.name).join(', ') || 'Unknown',
        duration: v.duration?.text || ''
      }));
    } else {
      const search = await yt.search(query, { type: 'video' });
      videos = search.videos.slice(0, 10).map(v => ({
        id: v.id,
        title: v.title?.text || v.title || 'Unknown Title',
        thumbnail: v.best_thumbnail?.url || v.thumbnails?.[0]?.url || '',
        artist: v.author?.name || 'Unknown',
        duration: v.duration?.text || ''
      }));
    }

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search for music' }, { status: 500 });
  }
}
