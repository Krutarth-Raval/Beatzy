import { NextResponse } from 'next/server';

export const maxDuration = 60; // Increase timeout to 60 seconds for yt-dlp

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');
  const q = searchParams.get('q');
  let durationMs = searchParams.get('durationMs');

  // Handle formats like "2:41" or "1:02:14" and convert them to ms for the backend
  if (durationMs && typeof durationMs === 'string' && durationMs.includes(':')) {
    const parts = durationMs.split(':').map(Number).reverse();
    let totalSeconds = 0;
    if (parts[0]) totalSeconds += parts[0]; // seconds
    if (parts[1]) totalSeconds += parts[1] * 60; // minutes
    if (parts[2]) totalSeconds += parts[2] * 3600; // hours
    durationMs = (totalSeconds * 1000).toString();
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  // If the ID is a Spotify ID, we must resolve it to a YouTube video ID first
  if (id.includes('spotify:') || id.length > 15) {
    if (q) {
      try {
        const ytsr = require('youtube-sr').default;
        const searchResults = await ytsr.search(q, { limit: 1, type: "video" });
        if (searchResults && searchResults.length > 0) {
          id = searchResults[0].id;
        } else {
          // Fallback to yt-search
          const ytSearch = require('yt-search');
          const r = await ytSearch(q);
          if (r && r.videos && r.videos.length > 0) {
            id = r.videos[0].videoId;
          } else {
            return NextResponse.json({ error: 'Could not find a YouTube equivalent for this Spotify track.' }, { status: 404 });
          }
        }
      } catch (e) {
        console.error('Search resolution error:', e);
        return NextResponse.json({ error: 'Search resolution failed' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Query (q) parameter is required to resolve Spotify tracks.' }, { status: 400 });
    }
  }

  try {
    let directUrl = null;
    let directUrlError = null;

    // ==========================================
    // EXTRACT USING DEDICATED PYTHON BACKEND
    // ==========================================
    const backendUrl = process.env.EXTRACTOR_URL || 'http://127.0.0.1:8000';
    
    try {
      let fetchUrl = q ? `${backendUrl}/api/extract-url?id=${id}&q=${encodeURIComponent(q)}` : `${backendUrl}/api/extract-url?id=${id}`;
      if (durationMs) fetchUrl += `&durationMs=${durationMs}`;
      
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          directUrl = data.url;
          console.log('Successfully extracted using dedicated backend');
        }
      } else {
        const errorData = await res.json();
        directUrlError = 'Dedicated backend failed: ' + (errorData.detail || res.statusText);
        console.error(directUrlError);
      }
    } catch (e) {
      directUrlError = 'Dedicated backend error: ' + (e.message || String(e));
      console.error(directUrlError);
    }

    if (!directUrl) {
      throw new Error(directUrlError || 'Could not find direct audio stream URL from extractors');
    }

    // Return the direct URL immediately instead of downloading and streaming it here
    return NextResponse.json({ url: directUrl });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message || 'Failed to extract URL', stack: error.stack }, { status: 500 });
  }
}
