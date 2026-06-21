import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
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

    // 3. Fallback to native yt-dlp extraction (matches /api/download fallback)
    if (!directUrl) {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const fs = require('fs');
        const os = require('os');
        const path = require('path');

        let ytDlpPath;
        const isVercel = process.env.VERCEL === '1';

        if (isVercel) {
          ytDlpPath = path.join(os.tmpdir(), 'yt-dlp_static');
          
          if (!fs.existsSync(ytDlpPath)) {
            console.log('Downloading statically compiled yt-dlp_linux to bypass python requirement...');
            const downloadRes = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux');
            if (!downloadRes.ok) throw new Error('Failed to download yt-dlp binary');
            const buffer = await downloadRes.arrayBuffer();
            fs.writeFileSync(ytDlpPath, Buffer.from(buffer));
            fs.chmodSync(ytDlpPath, 0o777);
          }
        } else {
          ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
          if (!fs.existsSync(ytDlpPath)) {
            ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
          }
        }

        const command = `"${ytDlpPath}" -j --force-ipv6 --extractor-args "youtube:player_client=android" --no-warnings "https://www.youtube.com/watch?v=${id}"`;
        const { stdout } = await execAsync(command);
        const info = JSON.parse(stdout);
        
        // Find best audio format exactly like /api/download does
        const audioFormats = info.formats
          .filter(f => f.acodec && f.acodec !== 'none')
          .sort((a, b) => {
            if (a.vcodec === 'none' && b.vcodec !== 'none') return -1;
            if (a.vcodec !== 'none' && b.vcodec === 'none') return 1;
            const isAUniversal = a.ext === 'm4a' || a.ext === 'mp4';
            const isBUniversal = b.ext === 'm4a' || b.ext === 'mp4';
            if (isAUniversal && !isBUniversal) return -1;
            if (!isAUniversal && isBUniversal) return 1;
            return (b.abr || 0) - (a.abr || 0);
          });

        if (audioFormats.length > 0) {
          directUrl = audioFormats[0].url;
        } else {
          directUrl = info.url;
        }
      } catch (e) {
        directUrlError = 'yt-dlp fallback failed: ' + (e.message || String(e));
        console.error(directUrlError);
      }
    }

    if (!directUrl) {
      throw new Error(directUrlError || 'Could not find direct audio stream URL from extractors');
    }

    // Extract the Range header from the client request
    const rangeHeader = request.headers.get('range');
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      // CRITICAL: Always inject a Range header to bypass YouTube's 50kbps full-file throttling
      'Range': rangeHeader || 'bytes=0-'
    };

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
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
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
    return NextResponse.json({ error: error.message || 'Failed to stream audio', stack: error.stack }, { status: 500 });
  }
}
