import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  let ytDlpPath;
  const isVercel = process.env.VERCEL === '1';

  if (isVercel) {
    const vercelBinPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
    ytDlpPath = path.join(os.tmpdir(), 'yt-dlp');
    if (!fs.existsSync(ytDlpPath)) {
      try {
        fs.copyFileSync(vercelBinPath, ytDlpPath);
        fs.chmodSync(ytDlpPath, 0o777);
      } catch (e) {
        console.error("Failed to copy yt-dlp binary to tmp on Vercel", e);
      }
    }
  } else {
    ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
    if (!fs.existsSync(ytDlpPath)) {
      ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
    }
  }

  try {
    // We request the best audio format natively supported everywhere (webm/m4a)
    // -o - pipes the output to stdout
    // -q suppresses logs so they don't corrupt the stdout binary stream
    const commandArgs = [
      '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio', 
      '--no-warnings',
      '-q',
      '-o', '-', 
      `https://www.youtube.com/watch?v=${id}`
    ];

    const ytProcess = spawn(ytDlpPath, commandArgs);

    ytProcess.stderr.on('data', (data) => {
      console.log(`yt-dlp stream info: ${data}`);
    });

    // Create a ReadableStream from the child process stdout
    const stream = new ReadableStream({
      start(controller) {
        ytProcess.stdout.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        ytProcess.stdout.on('end', () => {
          controller.close();
        });
        ytProcess.stdout.on('error', (err) => {
          console.error('yt-dlp stdout error:', err);
          controller.error(err);
        });
        ytProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
          }
        });
      },
      cancel() {
        ytProcess.kill();
      }
    });

    const headers = new Headers();
    headers.set('Content-Type', 'audio/webm');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(stream, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
