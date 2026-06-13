import { NextResponse } from 'next/server';
import play from 'play-dl';
import ytdl from '@distube/ytdl-core';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // 1. Search for the song on YouTube
    const r = await play.search(query + ' audio', { limit: 1 });
    const video = r[0];
    
    if (!video) {
      return NextResponse.json({ error: 'No matching audio found' }, { status: 404 });
    }

    // 2. Stream the audio using ytdl-core
    const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
    
    // 3. Convert Node.js stream to Web ReadableStream for Next.js response
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
    
    // If it's a download request, add Content-Disposition header
    const download = searchParams.get('download');
    if (download === 'true') {
      // Clean filename
      const filename = video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      headers.set('Content-Disposition', `attachment; filename="${filename}.mp3"`);
    }

    return new NextResponse(readable, { headers });
  } catch (error) {
    console.error('Streaming API error:', error);
    return NextResponse.json({ error: 'Failed to process audio stream' }, { status: 500 });
  }
}
