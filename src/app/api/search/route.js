import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';

let innertube = null;
async function getInnertube() {
  if (!innertube) {
    innertube = await Innertube.create({ cache: new UniversalCache(false) });
  }
  return innertube;
}

/**
 * Normalize a string for comparison: lowercase, strip punctuation, collapse whitespace.
 */
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score a single result against the original query.
 * Higher score = better match.
 * Scoring heuristics:
 *  - +3 if result title contains every query word
 *  - +2 if normalized result title starts with the song name portion
 *  - +2 if result artist matches at least one artist token from the query
 *  - +1 for each additional query word found in the combined title+artist string
 *  - -1 if the result title has many extra words (likely a remix/cover)
 */
function scoreSongMatch(result, query, songName, artistName) {
  const qNorm = normalize(query);
  const sNorm = normalize(songName || '');
  const aNorm = normalize(artistName || '');
  const titleNorm = normalize(result.title);
  const artistNorm = normalize(result.artist);
  const combined = `${titleNorm} ${artistNorm}`;

  let score = 0;

  // Song name must appear in the result title
  const songTokens = sNorm.split(' ').filter(Boolean);
  const allSongTokensInTitle = songTokens.length > 0 && songTokens.every(t => titleNorm.includes(t));
  if (allSongTokensInTitle) score += 3;

  // Title starts with song name (exact match bonus)
  if (titleNorm.startsWith(sNorm)) score += 2;

  // Artist match bonus
  if (aNorm) {
    const artistTokens = aNorm.split(' ').filter(Boolean);
    const artistMatch = artistTokens.some(t => t.length > 2 && (artistNorm.includes(t) || titleNorm.includes(t)));
    if (artistMatch) score += 2;
  }

  // Bonus for each query word found in combined text
  const queryTokens = qNorm.split(' ').filter(t => t.length > 2);
  queryTokens.forEach(t => { if (combined.includes(t)) score += 0.5; });

  // Penalty: if result title has many words compared to song name (likely a remix or cover)
  const titleWordCount = titleNorm.split(' ').length;
  const songWordCount = Math.max(songTokens.length, 1);
  if (titleWordCount > songWordCount + 4) score -= 1;

  // Penalty for obvious covers/remixes/karaoke in the title
  const lowerTitle = result.title.toLowerCase();
  if (/\b(cover|karaoke|tribute|remix|version|instrumental|made famous)\b/.test(lowerTitle)) {
    score -= 2;
  }

  return score;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type');
  // When bestMatch=1, return only the single best-scored result (used by Spotify playlist playback)
  const bestMatch = searchParams.get('bestMatch') === '1';
  // Optional hints for scoring (song name and artist separate from the combined query)
  const songName = searchParams.get('songName') || query;
  const artistName = searchParams.get('artist') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    let videos = [];
    
    if (type === 'music') {
      const search = await yt.music.search(query, { type: 'song' });
      videos = (search.songs?.contents || []).slice(0, 10).map(v => {
        const rawThumb = v.thumbnails?.at(-1)?.url || v.thumbnails?.[0]?.url || '';
        const hiResThumb = rawThumb ? rawThumb.replace(/=w\d+-h\d+.*/, '=w500-h500-l90-rj') : rawThumb;
        return {
          id: v.id,
          title: v.title || 'Unknown Title',
          thumbnail: hiResThumb,
          artist: v.artists?.map(a => a.name).join(', ') || 'Unknown',
          duration: v.duration?.text || ''
        };
      });
    } else {
      const search = await yt.search(query, { type: 'video' });
      videos = search.videos.slice(0, 10).map(v => {
        // Upgrade YT thumbnail to highest available resolution
        const rawThumb = v.best_thumbnail?.url || v.thumbnails?.at(-1)?.url || v.thumbnails?.[0]?.url || '';
        const hiResThumb = rawThumb
          ? rawThumb.replace(/\/(default|mqdefault|hqdefault|sddefault)(\.[a-z]+)$/i, '/maxresdefault$2')
          : rawThumb;
        return {
          id: v.id,
          title: v.title?.text || v.title || 'Unknown Title',
          thumbnail: hiResThumb,
          artist: v.author?.name || 'Unknown',
          duration: v.duration?.text || ''
        };
      });
    }

    if (bestMatch && videos.length > 0) {
      // Score each result and return only the best matching one
      const scored = videos.map(v => ({
        ...v,
        _score: scoreSongMatch(v, query, songName, artistName)
      }));
      scored.sort((a, b) => b._score - a._score);
      const best = scored[0];
      delete best._score;
      return NextResponse.json([best]);
    }

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search for music' }, { status: 500 });
  }
}
