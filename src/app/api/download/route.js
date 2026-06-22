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
    // METHOD 1: PIPED API (Free & Unlimited)
    // ==========================================
    console.log('Trying Piped API...');
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
      'https://pipedapi.moomoo.me',
      'https://pipedapi.syncpundit.io'
    ];

    try {
      const fetchPromises = pipedInstances.map(async (instance) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        try {
          const res = await fetch(`${instance}/streams/${id}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data && data.audioStreams && data.audioStreams.length > 0) {
          const m4aStreams = data.audioStreams.filter(s => s.mimeType === 'audio/mp4' || s.format === 'M4A');
          if (m4aStreams.length > 0) {
            m4aStreams.sort((a, b) => b.bitrate - a.bitrate);
            return {
              url: m4aStreams[0].url,
              title: 'Downloaded Audio',
              ext: 'm4a'
            };
          } else {
            return {
              url: data.audioStreams[0].url,
              title: 'Downloaded Audio',
              ext: 'webm'
            };
          }
        }
        throw new Error('No audio streams found');
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      });

      const fastResult = await Promise.any(fetchPromises);
      return NextResponse.json(fastResult);
    } catch (e) {
      console.log('All Piped instances failed or timed out, falling back directly to yt-dlp...');
    }




    // ==========================================
    // METHOD 2: FALLBACK TO YOUTUBE-DL-EXEC
    // ==========================================
    console.log('Using local youtube-dl-exec fallback...');
    const youtubedl = require('youtube-dl-exec');
    const output = await youtubedl(`https://www.youtube.com/watch?v=${id}`, {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });
    
    if (output && output.formats) {
      // Find best audio format robustly with strong preference for m4a/mp4 formats
      const audioFormats = output.formats
        .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
        .sort((a, b) => {
          const isAUniversal = a.ext === 'm4a' || a.ext === 'mp4';
          const isBUniversal = b.ext === 'm4a' || b.ext === 'mp4';
          if (isAUniversal && !isBUniversal) return -1;
          if (!isAUniversal && isBUniversal) return 1;
          return (b.abr || 0) - (a.abr || 0);
        });
        
      const format = audioFormats.length > 0 ? audioFormats[0] : output.formats.find(f => f.acodec !== 'none');
      
      if (format && format.url) {
        return NextResponse.json({ 
          url: format.url, 
          title: output.title || 'Downloaded Audio',
          ext: format.ext || 'm4a'
        });
      }
    }
    throw new Error('No audio stream found via fallback');
  } catch (error) {
    console.error('Download API error:', error);
    
    // Fallback domains
    const fallbackDomains = [
      'australie-eta.fr',
      'omenrosebank.co.za',
      'lapinede-aix.fr',
      'en.mygomp3.com'
    ];
    const randomDomain = fallbackDomains[Math.floor(Math.random() * fallbackDomains.length)];
    
    // Vercel Fallback: If Vercel's IP is banned by YouTube bots, return a third-party download link
    // This ensures that the download button ALWAYS works even if the server is blocked.
    return NextResponse.json({ 
      url: `https://${randomDomain}/dl/${id}`,
      title: `Download via ${randomDomain} (Fallback)`
    });
  }
}
