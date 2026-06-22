import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    let { url } = await request.json();
    
    if (!url || (!url.includes('youtube.com/playlist') && !url.includes('youtu.be') && !url.includes('youtube.com/watch'))) {
      return NextResponse.json({ error: 'Invalid YouTube Playlist URL' }, { status: 400 });
    }

    const listIdMatch = url.match(/[?&]list=([^&]+)/);
    if (!listIdMatch) {
      return NextResponse.json({ error: 'No playlist ID found in URL' }, { status: 400 });
    }

    // Always fetch the standard desktop playlist page to ensure consistent ytInitialData structure
    url = `https://www.youtube.com/playlist?list=${listIdMatch[1]}`;

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

    if (items && items.length === 1 && items[0].playlistVideoListRenderer?.contents) {
      items = items[0].playlistVideoListRenderer.contents;
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
      let durationMs = 0;

      // Parse New UI (lockupViewModel)
      if (lockup.rendererContext?.accessibilityContext?.label) {
        let label = lockup.rendererContext.accessibilityContext.label;
        name = label;
        
        // Extract duration from accessibility string (e.g. "3 minutes, 41 seconds")
        const minMatch = label.match(/(\d+)\s+minutes?/);
        const secMatch = label.match(/(\d+)\s+seconds?/);
        const hrMatch = label.match(/(\d+)\s+hours?/);
        let totalSeconds = 0;
        if (hrMatch) totalSeconds += parseInt(hrMatch[1]) * 3600;
        if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
        if (secMatch) totalSeconds += parseInt(secMatch[1]);
        if (totalSeconds > 0) durationMs = totalSeconds * 1000;

        // Clean up the accessibility string
        name = name.replace(/ \d+ hours?,? \d+ minutes?,? \d+ seconds?/, '').replace(/ \d+ minutes?,? \d+ seconds?/, '').trim();
      } 
      // Parse Legacy UI (playlistVideoRenderer)
      else if (lockup.title?.runs?.[0]?.text) {
        name = lockup.title.runs[0].text;
        artist = lockup.shortBylineText?.runs?.[0]?.text || 'Unknown Artist';
        
        // Extract duration from lengthText
        if (lockup.lengthText?.simpleText) {
           const timeParts = lockup.lengthText.simpleText.split(':').map(Number).reverse();
           let totalSeconds = 0;
           if (timeParts[0]) totalSeconds += timeParts[0]; // seconds
           if (timeParts[1]) totalSeconds += timeParts[1] * 60; // minutes
           if (timeParts[2]) totalSeconds += timeParts[2] * 3600; // hours
           durationMs = totalSeconds * 1000;
        }
      }

      formattedTracks.push({
        id,
        name,
        artists: artist,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        duration: durationMs || null
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
