import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    // Resolve absolute path to yt-dlp.exe to bypass Next.js Webpack context issues
    const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
    const command = `"${ytDlpPath}" -j --no-warnings --prefer-free-formats "https://www.youtube.com/watch?v=${id}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    const output = JSON.parse(stdout);

    // Find the best audio format (highest bitrate, m4a or mp3 usually)
    const audioFormats = output.formats
      .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));

    if (audioFormats.length > 0) {
      return NextResponse.json({ 
        url: audioFormats[0].url, 
        title: output.title,
        ext: audioFormats[0].ext
      });
    } else {
      return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract download link',
      details: error.message || error.toString()
    }, { status: 500 });
  }
}
