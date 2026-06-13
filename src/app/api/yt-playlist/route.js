import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('youtube.com/playlist')) {
      return NextResponse.json({ error: 'Invalid YouTube Playlist URL' }, { status: 400 });
    }

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', binaryName);
    // --flat-playlist extracts the list without downloading
    // -J dumps it as JSON
    const command = `"${ytDlpPath}" --flat-playlist -J "${url}"`;
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 50 }); // 50MB buffer for huge playlists

    if (!stdout) {
      throw new Error(stderr || 'Failed to extract playlist');
    }

    const data = JSON.parse(stdout);

    if (!data.entries) {
      throw new Error('No tracks found in playlist.');
    }

    const formattedTracks = data.entries.map(track => ({
      id: track.id,
      name: track.title,
      artists: track.uploader || 'Unknown Artist',
    }));

    return NextResponse.json({
      title: data.title || 'YouTube Playlist',
      type: 'Playlist',
      coverArt: 'https://www.youtube.com/img/desktop/yt_1200.png', // Generic fallback
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('YouTube Playlist extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract YouTube Playlist.' }, { status: 500 });
  }
}
