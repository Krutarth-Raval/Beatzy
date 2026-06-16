import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Forward the Range header if the browser sends one (crucial for Safari/iOS)
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // Fetch the audio stream from the actual source
    const response = await fetch(url, {
      headers: fetchHeaders
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch audio from source' }, { status: response.status });
    }

    // Pass along the headers but add CORS headers so the browser can read it
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.delete('content-encoding'); // Let Next.js handle encoding
    
    // Return the response stream directly back to the client
    return new NextResponse(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Proxy failed to stream the audio' }, { status: 500 });
  }
}
