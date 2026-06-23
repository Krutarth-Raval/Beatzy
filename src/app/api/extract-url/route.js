import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');
  const q = searchParams.get('q');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  // Helper to parse ISO 8601 duration string from YouTube API (e.g., PT4M43S)
  const parseIsoDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
  };

  // If the ID is a Spotify ID, resolve it to an exact YouTube video ID using the official Data API
  if (id.includes('spotify:') || id.length > 15) {
    if (q) {
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        
        let targetDurationSec = null;
        const durationParam = searchParams.get('durationMs');
        if (durationParam && durationParam !== 'null' && durationParam !== 'undefined') {
          if (durationParam.includes(':')) {
             const parts = durationParam.split(':').reverse();
             targetDurationSec = (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) * 3600;
          } else {
             targetDurationSec = parseInt(durationParam, 10);
             if (targetDurationSec > 10000) targetDurationSec = Math.floor(targetDurationSec / 1000); // Convert ms to sec
          }
        }

        if (apiKey) {
          // Use official Data API for high accuracy. Fetch top 5 to compare durations.
          const maxRes = targetDurationSec ? 5 : 1;
          const qAudio = q.toLowerCase().includes('audio') ? q : `${q} audio`;
          const ytSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(qAudio)}&type=video&videoCategoryId=10&key=${apiKey}&maxResults=${maxRes}`;
          const res = await fetch(ytSearchUrl);
          
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              
              if (!targetDurationSec) {
                // If no duration provided, just use the first result
                id = data.items[0].id.videoId;
              } else {
                // Fetch durations for the top 5 results
                const videoIds = data.items.map(item => item.id.videoId).join(',');
                const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
                const detailRes = await fetch(detailUrl);
                
                if (detailRes.ok) {
                  const detailData = await detailRes.json();
                  let bestMatchId = data.items[0].id.videoId;
                  let smallestDiff = Infinity;
                  
                  detailData.items.forEach(item => {
                    const durationSec = parseIsoDuration(item.contentDetails.duration);
                    const diff = Math.abs(durationSec - targetDurationSec);
                    // Penalize videos that are wildly off, reward close matches
                    if (diff < smallestDiff) {
                      smallestDiff = diff;
                      bestMatchId = item.id;
                    }
                  });
                  
                  id = bestMatchId;
                } else {
                  id = data.items[0].id.videoId; // fallback
                }
              }
            }
          } else {
            console.error('YouTube API Error:', await res.text());
            throw new Error('Data API failed');
          }
        } else {
          // Fallback if no API key is provided
          const ytsr = require('youtube-sr').default;
          const searchResults = await ytsr.search(q, { limit: 5, type: "video" });
          if (searchResults && searchResults.length > 0) {
            if (!targetDurationSec) {
              id = searchResults[0].id;
            } else {
              let bestMatchId = searchResults[0].id;
              let smallestDiff = Infinity;
              searchResults.forEach(item => {
                // youtube-sr duration is in ms
                const durationSec = Math.floor(item.duration / 1000);
                const diff = Math.abs(durationSec - targetDurationSec);
                if (diff < smallestDiff) {
                  smallestDiff = diff;
                  bestMatchId = item.id;
                }
              });
              id = bestMatchId;
            }
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

  // We are now using the YouTube IFrame Player API on the frontend, so we no longer
  // need to extract a direct MP3 URL via the Python backend. We just return the exact video ID!
  return NextResponse.json({ id: id, type: 'youtube' });
}
