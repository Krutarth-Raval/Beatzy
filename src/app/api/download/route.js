import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    const isWindows = os.platform() === 'win32';
    const tmpPath = path.join(os.tmpdir(), 'yt-dlp');

    let ytDlpPath = isWindows 
      ? path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe') 
      : tmpPath;

    // Vercel Serverless environment lacks python3. We must download the standalone Linux binary
    if (!isWindows) {
      if (!fs.existsSync(tmpPath)) {
        console.log('Downloading standalone yt-dlp_linux to /tmp...');
        const res = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux');
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(tmpPath, Buffer.from(buffer));
        fs.chmodSync(tmpPath, 0o777);
        console.log('Successfully downloaded and made executable.');
      }
    }

    const command = `"${ytDlpPath}" -j --no-warnings --prefer-free-formats "https://www.youtube.com/watch?v=${id}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    const output = JSON.parse(stdout);

    // Find the best audio format. We prefer audio-only (vcodec === 'none')
    const audioFormats = output.formats
      .filter(f => f.acodec && f.acodec !== 'none')
      .sort((a, b) => {
        // Prefer pure audio streams first
        if (a.vcodec === 'none' && b.vcodec !== 'none') return -1;
        if (a.vcodec !== 'none' && b.vcodec === 'none') return 1;
        // Then sort by audio bitrate
        return (b.abr || 0) - (a.abr || 0);
      });

    if (audioFormats.length > 0) {
      return NextResponse.json({ 
        url: audioFormats[0].url, 
        title: output.title,
        ext: audioFormats[0].ext
      });
    } else {
      throw new Error('No audio stream found');
    }
  } catch (error) {
    console.error('Download API error:', error);
    
    // Vercel Fallback: If Vercel's IP is banned by YouTube bots, return a third-party download link
    // This ensures that the download button ALWAYS works even if the server is blocked.
    return NextResponse.json({ 
      url: `https://yt1s.com/en/youtube-to-mp3?q=https://www.youtube.com/watch?v=${id}`,
      title: 'Download via YT1s (Fallback)'
    });
  }
}
