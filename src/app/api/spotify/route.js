import { NextResponse } from 'next/server';
import spotifyUrlInfo from 'spotify-url-info';

const { getTracks, getData } = spotifyUrlInfo(fetch);

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('spotify.com')) {
      return NextResponse.json({ error: 'Invalid Spotify URL' }, { status: 400 });
    }

    const data = await getData(url);
    const tracksData = await getTracks(url);

    if (!data || !tracksData) {
      throw new Error('Could not extract data from this Spotify URL.');
    }

    const formattedTracks = tracksData.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists ? track.artists.map(a => a.name).join(', ') : 'Unknown Artist',
    }));

    return NextResponse.json({
      title: data.name || data.title,
      type: data.type,
      coverArt: data.coverArt?.sources?.[0]?.url || data.images?.[0]?.url || '',
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('Spotify extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract Spotify data. Make sure the playlist is public.' }, { status: 500 });
  }
}
