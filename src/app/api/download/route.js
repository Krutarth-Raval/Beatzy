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
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    
    // Original path created during Vercel build / local npm install
    let ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', binaryName);
    
    // Vercel Serverless environment workaround
    // Vercel mounts /var/task as read-only. The yt-dlp binary often loses its +x executable flag during deployment.
    // To fix this, we must copy the binary to the writable /tmp directory and give it execution permissions.
    if (!isWindows) {
      const tmpPath = path.join('/tmp', 'yt-dlp');
      if (!fs.existsSync(tmpPath)) {
        if (fs.existsSync(ytDlpPath)) {
          fs.copyFileSync(ytDlpPath, tmpPath);
          fs.chmodSync(tmpPath, 0o777);
        } else {
          // Fallback if Vercel tree-shaking removed node_modules
          throw new Error('yt-dlp binary not found in deployment package.');
        }
      }
      ytDlpPath = tmpPath;
    }

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
