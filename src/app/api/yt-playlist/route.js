import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url || (!url.includes('youtube.com/playlist') && !url.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube Playlist URL' }, { status: 400 });
    }

    // Fetch the raw HTML of the YouTube Playlist
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlist page.');
    }

    const html = await response.text();
    
    // Extract ytInitialData JSON object from the HTML
    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!match) {
      throw new Error('Could not find playlist data in page.');
    }

    const data = JSON.parse(match[1]);
    
    // Navigate YouTube's heavily nested JSON structure
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    let items = null;
    
    for (const tab of tabs) {
      const contents = tab.tabRenderer?.content?.sectionListRenderer?.contents;
      if (contents) {
        for (const content of contents) {
          if (content.itemSectionRenderer?.contents) {
            items = content.itemSectionRenderer.contents;
            break;
          }
        }
      }
      if (items) break;
    }

    if (!items || !items.length) {
      throw new Error('No tracks found in playlist.');
    }

    const formattedTracks = [];
    
    for (const item of items) {
      // YouTube recently changed playlistVideoRenderer to lockupViewModel
      const lockup = item.lockupViewModel || item.playlistVideoRenderer;
      if (!lockup) continue;

      const id = lockup.contentId || lockup.videoId;
      if (!id) continue;

      let name = 'Unknown Title';
      let artist = 'Unknown Artist';

      // Parse New UI (lockupViewModel)
      if (lockup.rendererContext?.accessibilityContext?.label) {
        name = lockup.rendererContext.accessibilityContext.label;
        // Clean up the accessibility string which usually has "Artist - Song Title duration"
        name = name.replace(/ \d+ minutes?,? \d+ seconds?/, '').trim();
      } 
      // Parse Legacy UI (playlistVideoRenderer)
      else if (lockup.title?.runs?.[0]?.text) {
        name = lockup.title.runs[0].text;
        artist = lockup.shortBylineText?.runs?.[0]?.text || 'Unknown Artist';
      }

      formattedTracks.push({
        id,
        name,
        artists: artist,
      });
    }

    // Attempt to extract Playlist Title
    let playlistTitle = 'YouTube Playlist';
    try {
      playlistTitle = data.metadata?.playlistMetadataRenderer?.title || data.header?.playlistHeaderRenderer?.title?.simpleText || 'YouTube Playlist';
    } catch(e) {}

    return NextResponse.json({
      title: playlistTitle,
      type: 'Playlist',
      coverArt: 'https://www.youtube.com/img/desktop/yt_1200.png',
      tracks: formattedTracks,
    });

  } catch (error) {
    console.error('YouTube Playlist extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract YouTube Playlist. Please ensure it is public.' }, { status: 500 });
  }
}
