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

    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
      'https://pipedapi.moomoo.me',
      'https://pipedapi.syncpundit.io'
    ];

    // 1. Try Piped API instances
    for (const instance of pipedInstances) {
      if (directUrl) break;
      try {
        const res = await fetch(`${instance}/streams/${id}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.audioStreams && data.audioStreams.length > 0) {
            // Prefer M4A streams for native iOS/browser support
            const m4aStreams = data.audioStreams.filter(s => s.mimeType === 'audio/mp4' || s.format === 'M4A');
            if (m4aStreams.length > 0) {
              m4aStreams.sort((a, b) => b.bitrate - a.bitrate);
              directUrl = m4aStreams[0].url;
            } else {
              directUrl = data.audioStreams[0].url;
            }
          }
        }
      } catch (e) {
        // Ignore and try next instance
      }
    }

    // 2. Try RapidAPI if Piped fails
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

    // Extract the Range header from the client request
    const rangeHeader = request.headers.get('range');
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // 3. Fetch the actual audio binary stream from the provided URL
    const audioRes = await fetch(directUrl, {
      headers: fetchHeaders
    });

    if (!audioRes.ok && audioRes.status !== 206) {
      throw new Error(`Failed to fetch audio stream: ${audioRes.status}`);
    }

    // 4. Stream the binary directly to the client
    const headers = new Headers();
    // Force audio/mp4 so iOS safari can play the downloaded blob natively!
    headers.set('Content-Type', 'audio/mp4');
    headers.set('Access-Control-Allow-Origin', '*');
    
    // Pass through critical streaming headers
    headers.set('Accept-Ranges', 'bytes');
    
    const contentLength = audioRes.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    
    const contentRange = audioRes.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    return new NextResponse(audioRes.body, {
      status: audioRes.status, // Can be 200 or 206
      headers
    });
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
