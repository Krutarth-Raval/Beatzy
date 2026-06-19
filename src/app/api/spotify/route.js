import { NextResponse } from 'next/server';
import spotifyUrlInfo from 'spotify-url-info';

const { getData } = spotifyUrlInfo(fetch);

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('spotify.com')) {
      return NextResponse.json({ error: 'Invalid Spotify URL' }, { status: 400 });
    }

    // getData() gives us the full raw Spotify entity with complete track data
    // including the artists array and album — getTracks() strips this down to a
    // simplified object that loses individual artist names.
    const data = await getData(url);

    if (!data) {
      throw new Error('Could not extract data from this Spotify URL.');
    }

    // The raw data has a trackList array with complete track objects
    const rawTracks = data.trackList || (data.type === 'track' ? [data] : []);

    const formattedTracks = rawTracks.map(track => {
      // Each raw track has an `artists` array of { name, uri } objects
      const artistList = Array.isArray(track.artists)
        ? track.artists.map(a => a.name).filter(Boolean)
        : [];

      // Fallback: some track shapes have a subtitle string or a show publisher
      const artistsFallback = track.subtitle || track.show?.publisher || '';

      const primaryArtist = artistList[0] || artistsFallback || 'Unknown Artist';
      const allArtists = artistList.length > 0 ? artistList.join(', ') : artistsFallback || 'Unknown Artist';

      return {
        id: track.uid || track.uri,
        name: track.title || track.name || 'Unknown Title',
        // Primary artist (first one) — used as the main search hint
        artist: primaryArtist,
        // All artists joined — shown in the UI
        artists: allArtists,
        // Album name helps disambiguate songs with common names
        album: track.album?.name || track.albumOfTrack?.name || '',
        // Duration in ms — optional metadata
        duration: track.duration || null,
      };
    });

    return NextResponse.json({
      title: data.name || data.title,
      type: data.type,
      // coverArt.sources[] is sorted smallest→largest; pick last for highest resolution
      coverArt: data.coverArt?.sources?.at(-1)?.url || data.images?.[0]?.url || '',
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('Spotify extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract Spotify data. Make sure the playlist is public.' }, { status: 500 });
  }
}
