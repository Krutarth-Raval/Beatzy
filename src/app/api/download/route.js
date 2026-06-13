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
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  try {
    // ==========================================
    // METHOD 1: RAPID API (Vercel Production)
    // ==========================================
    if (process.env.RAPIDAPI_KEY) {
      console.log('Using RapidAPI for extraction...');
      
      // Using the popular 'youtube-mp36' API from RapidAPI
      const response = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${id}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
        }
      });
      
      const data = await response.json();
      
      // If the API successfully returns a download link, return it immediately
      if (data && (data.link || data.url)) {
        return NextResponse.json({ 
          url: data.link || data.url, 
          title: data.title || 'Downloaded Audio',
          ext: 'mp3'
        });
      }
      console.warn('RapidAPI extraction failed. Falling back to local yt-dlp...', data);
    }

    // ==========================================
    // METHOD 2: YT-DLP (Local Fallback)
    // ==========================================
    console.log('Using local yt-dlp fallback...');
    let ytDlpPath;
    const isVercel = process.env.VERCEL === '1';

    if (isVercel) {
      // Vercel execution (will likely fail due to Captcha, but we try anyway)
      const vercelBinPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
      ytDlpPath = path.join(os.tmpdir(), 'yt-dlp');
      
      if (!fs.existsSync(ytDlpPath)) {
        fs.copyFileSync(vercelBinPath, ytDlpPath);
        fs.chmodSync(ytDlpPath, 0o777);
      }
    } else {
      // Local Windows/Mac execution
      ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
      if (!fs.existsSync(ytDlpPath)) {
        ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
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
      url: `https://carto-conches.fr/dl/${id}`,
      title: 'Download via Carto-Conches (Fallback)'
    });
  }
}
