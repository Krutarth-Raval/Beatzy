import { NextResponse } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    const output = await youtubedl(`https://www.youtube.com/watch?v=${id}`, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    if (!output || !output.formats) {
      throw new Error('Failed to parse video info.');
    }

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
