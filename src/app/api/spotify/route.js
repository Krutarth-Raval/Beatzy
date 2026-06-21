import { NextResponse } from 'next/server';
import spotifyUrlInfo from 'spotify-url-info';

const { getData } = spotifyUrlInfo(fetch);

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('spotify.com')) {
      return NextResponse.json({ error: 'Invalid Spotify URL' }, { status: 400 });
    }

    const token = await getSpotifyToken();

    // If we have API keys, try using the robust official API first
    if (token) {
      const match = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if (match) {
        try {
          const [_, type, id] = match;
          const headers = { 'Authorization': `Bearer ${token}` };

          if (type === 'playlist') {
            const res = await fetch(`https://api.spotify.com/v1/playlists/${id}`, { headers });
            if (res.ok) {
              const data = await res.json();
              return NextResponse.json({
                title: data.name,
                type: 'playlist',
                coverArt: data.images?.[0]?.url || '',
                tracks: data.tracks.items.map(item => item.track).filter(Boolean).map(track => ({
                  id: `spotify:track:${track.id}`,
                  name: track.name,
                  artist: track.artists?.[0]?.name || 'Unknown Artist',
                  artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                  album: track.album?.name || '',
                  coverArt: track.album?.images?.[0]?.url || '',
                  duration: track.duration_ms
                }))
              });
            } else {
              console.warn('Spotify API playlist fetch failed, falling back to scraper.', await res.text());
            }
          } else if (type === 'album') {
            const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, { headers });
            if (res.ok) {
              const data = await res.json();
              const albumCover = data.images?.[0]?.url || '';
              return NextResponse.json({
                title: data.name,
                type: 'album',
                coverArt: albumCover,
                tracks: data.tracks.items.map(track => ({
                  id: `spotify:track:${track.id}`,
                  name: track.name,
                  artist: track.artists?.[0]?.name || 'Unknown Artist',
                  artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                  album: data.name,
                  coverArt: albumCover,
                  duration: track.duration_ms
                }))
              });
            } else {
              console.warn('Spotify API album fetch failed, falling back to scraper.', await res.text());
            }
          } else if (type === 'track') {
            const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, { headers });
            if (res.ok) {
              const track = await res.json();
              return NextResponse.json({
                title: track.name,
                type: 'track',
                coverArt: track.album?.images?.[0]?.url || '',
                tracks: [{
                  id: `spotify:track:${track.id}`,
                  name: track.name,
                  artist: track.artists?.[0]?.name || 'Unknown Artist',
                  artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                  album: track.album?.name || '',
                  coverArt: track.album?.images?.[0]?.url || '',
                  duration: track.duration_ms
                }]
              });
            } else {
              console.warn('Spotify API track fetch failed, falling back to scraper.', await res.text());
            }
          }
        } catch (apiErr) {
          console.warn('Official Spotify API threw an error, falling back to scraper:', apiErr);
        }
      }
    }

    // FALLBACK to web scraper if no token or unsupported type
    const extractPromise = getData(url);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Spotify extraction timed out. Spotify may be blocking the request.')), 15000)
    );

    const data = await Promise.race([extractPromise, timeoutPromise]);

    if (!data) {
      throw new Error('Could not extract data from this Spotify URL.');
    }

    const rawTracks = data.trackList || (data.type === 'track' ? [data] : []);
    const formattedTracks = rawTracks.map(track => {
      const artistList = Array.isArray(track.artists) ? track.artists.map(a => a.name).filter(Boolean) : [];
      const artistsFallback = track.subtitle || track.show?.publisher || '';
      const primaryArtist = artistList[0] || artistsFallback || 'Unknown Artist';
      const allArtists = artistList.length > 0 ? artistList.join(', ') : artistsFallback || 'Unknown Artist';

      return {
        id: track.uri || track.uid,
        name: track.title || track.name || 'Unknown Title',
        artist: primaryArtist,
        artists: allArtists,
        album: track.album?.name || track.albumOfTrack?.name || '',
        coverArt: '', // Scraper doesn't provide this accurately
        duration: track.duration || null,
      };
    });

    return NextResponse.json({
      title: data.name || data.title,
      type: data.type,
      coverArt: data.coverArt?.sources?.at(-1)?.url || data.images?.[0]?.url || '',
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('Spotify extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract Spotify data. Ensure link is public.' }, { status: 500 });
  }
}
