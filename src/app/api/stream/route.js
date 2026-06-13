import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';
import ytdl from '@distube/ytdl-core';

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
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    const search = await yt.search(query + ' audio', { type: 'video' });
    const video = search.videos[0];
    
    if (!video) {
      return NextResponse.json({ error: 'No matching audio found' }, { status: 404 });
    }

    const videoUrl = 'https://www.youtube.com/watch?v=' + video.id;
    const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
    
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
      }
    });

    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    
    const download = searchParams.get('download');
    if (download === 'true') {
      const filename = (video.title?.text || video.title || 'song').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      headers.set('Content-Disposition', `attachment; filename="${filename}.mp3"`);
    }

    return new NextResponse(readable, { headers });
  } catch (error) {
    console.error('Streaming API error:', error);
    return NextResponse.json({ error: 'Failed to process audio stream' }, { status: 500 });
  }
}
