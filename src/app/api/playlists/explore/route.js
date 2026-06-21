import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request) {
  try {
    const publicPlaylists = await prisma.playlist.findMany({
      where: { isPublic: true },
      include: {
        user: { select: { name: true } },
        _count: { select: { songs: true, savedBy: true } }
      },
      orderBy: { savedBy: { _count: 'desc' } }, // Order by most saved (Spotify style)
      take: 50 // Limit to top 50 for explore page
    });

    return NextResponse.json(publicPlaylists);
  } catch (error) {
    console.error('Explore Playlists GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch explore playlists' }, { status: 500 });
  }
}
