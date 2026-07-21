import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const qStr = query.toLowerCase().trim();

    // Fetch recent public playlists to apply fuzzy matching in JS
    const allPlaylists = await prisma.playlist.findMany({
      where: {
        isPublic: true
      },
      include: {
        user: { select: { name: true, image: true } },
        _count: { select: { songs: true, savedBy: true } }
      },
      take: 1000,
      orderBy: { createdAt: 'desc' }
    });

    // Helper for Bigram (Dice's Coefficient)
    const getBigrams = (str) => {
      const bg = [];
      for (let i = 0; i < str.length - 1; i++) bg.push(str.slice(i, i + 2));
      return bg;
    };
    const qBg = getBigrams(qStr);

    const scored = allPlaylists.map(p => {
      const pName = p.name.toLowerCase();
      const uName = (p.user?.name || '').toLowerCase();
      let score = 0;

      // Exact substring match gives high score
      if (pName.includes(qStr)) score += 50;
      if (uName.includes(qStr)) score += 30;

      // Word level matches
      const words = qStr.split(/\s+/);
      words.forEach(w => {
        if (pName.includes(w)) score += 10;
        if (uName.includes(w)) score += 5;
      });

      // Fuzzy bigram match (helps with typos like "absoltue" vs "absolute")
      const pBg = getBigrams(pName);
      let intersection = 0;
      qBg.forEach(bg => { if (pBg.includes(bg)) intersection++; });
      const dice = (2 * intersection) / (qBg.length + pBg.length || 1);
      score += (dice * 40);

      // Subsequence match (e.g. "abslt" for "absolute")
      let qIdx = 0;
      for (let i = 0; i < pName.length && qIdx < qStr.length; i++) {
        if (pName[i] === qStr[qIdx]) qIdx++;
      }
      if (qIdx === qStr.length) score += 20;

      return { playlist: p, score };
    });

    // Filter results with a minimum threshold and sort by highest score
    const results = scored
      .filter(s => s.score > 15) // Minimum score to filter out completely unrelated strings
      .sort((a, b) => b.score - a.score)
      .map(s => s.playlist)
      .slice(0, 20);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Playlist Search GET Error:', error);
    return NextResponse.json({ error: 'Failed to search playlists' }, { status: 500 });
  }
}
