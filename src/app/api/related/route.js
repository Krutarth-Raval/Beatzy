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
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    const upNext = await yt.music.getUpNext(id);
    
    const tracks = (upNext.contents || []).map(v => {
      // Handle the various ways youtubei.js exposes data depending on the node type
      const videoId = v.video_id || v.id;
      if (!videoId) return null;

      const title = v.title?.text || v.title || 'Unknown Title';
      const rawThumb = v.thumbnail?.at(-1)?.url || v.thumbnail?.[0]?.url || v.thumbnails?.at(-1)?.url || v.thumbnails?.[0]?.url || '';
      // Default to w500 to match search results and avoid 429
      const hiResThumb = rawThumb ? rawThumb.replace(/=w\d+-h\d+.*/, '=w500-h500-l90-rj') : rawThumb;
      
      const artist = v.author?.name || v.artists?.map(a => a.name).join(', ') || 'Unknown';
      const duration = v.duration?.text || v.duration || '';

      return {
        id: videoId,
        title,
        coverArt: hiResThumb,
        artists: artist,
        duration
      };
    }).filter(Boolean).slice(0, 20); // Keep top 20

    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Related API error:', error);
    return NextResponse.json({ error: 'Failed to get related tracks' }, { status: 500 });
  }
}
