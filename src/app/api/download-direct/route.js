import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  try {
    let directUrl = null;

    // 1. Try Cobalt API for lightning fast extraction
    try {
      const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${id}`,
          isAudioOnly: true,
          aFormat: 'mp3'
        })
      });

      if (cobaltRes.ok) {
        const cobaltData = await cobaltRes.json();
        if (cobaltData && cobaltData.url) {
          directUrl = cobaltData.url;
        }
      }
    } catch (e) {
      console.warn('Cobalt API failed', e);
    }

    // 2. Try RapidAPI if Cobalt fails
    if (!directUrl && process.env.RAPIDAPI_KEY) {
      try {
        const rapidRes = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${id}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
          }
        });
        const rapidData = await rapidRes.json();
        if (rapidData && (rapidData.link || rapidData.url)) {
          directUrl = rapidData.link || rapidData.url;
        }
      } catch (e) {
        console.warn('Rapid API failed', e);
      }
    }

    if (!directUrl) {
      throw new Error('Could not find direct audio stream URL from extractors');
    }

    // 3. Fetch the actual audio binary stream from the provided URL
    const audioRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio stream: ${audioRes.status}`);
    }

    // 4. Stream the binary directly to the client
    const headers = new Headers();
    // Force audio/mp4 so iOS safari can play the downloaded blob natively!
    headers.set('Content-Type', 'audio/mp4');
    headers.set('Access-Control-Allow-Origin', '*');
    
    const contentLength = audioRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
      headers.set('Access-Control-Expose-Headers', 'Content-Length');
    }

    return new NextResponse(audioRes.body, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
