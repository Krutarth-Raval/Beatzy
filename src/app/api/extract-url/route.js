import { NextResponse } from 'next/server';

export const maxDuration = 60; // Increase timeout to 60 seconds for yt-dlp

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');
  const q = searchParams.get('q');

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

    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
      'https://pipedapi.moomoo.me',
      'https://pipedapi.syncpundit.io'
    ];

    // 1. Try Piped API instances in parallel for maximum speed
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s absolute timeout for Piped

      const pipedPromises = pipedInstances.map(async (instance) => {
        const res = await fetch(`${instance}/streams/${id}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: controller.signal
        });
        if (!res.ok) throw new Error('Bad status');
        const data = await res.json();
        if (data && data.audioStreams && data.audioStreams.length > 0) {
          const m4aStreams = data.audioStreams.filter(s => s.mimeType === 'audio/mp4' || s.format === 'M4A');
          if (m4aStreams.length > 0) {
            m4aStreams.sort((a, b) => b.bitrate - a.bitrate);
            return m4aStreams[0].url;
          }
          return data.audioStreams[0].url;
        }
        throw new Error('No audio streams');
      });

      directUrl = await Promise.any(pipedPromises);
      clearTimeout(timeout);
    } catch (e) {
      // All piped instances failed or timed out, proceed to fallbacks
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

    // ==========================================
    // METHOD 2: FALLBACK TO DEDICATED PYTHON BACKEND
    // ==========================================
    if (!directUrl) {
      console.log('Using dedicated Python backend fallback...');
      const backendUrl = process.env.EXTRACTOR_URL || 'http://127.0.0.1:8000';
      
      try {
        const res = await fetch(`${backendUrl}/api/extract-url?id=${id}`);
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
