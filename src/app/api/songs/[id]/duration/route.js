import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await params;
    const songId = resolvedParams.id;
    const body = await request.json();

    if (!songId || !body.duration) {
      return NextResponse.json({ error: 'Song ID and duration are required' }, { status: 400 });
    }

    // Only update if it exists and duration is currently empty or '0'
    const song = await prisma.song.findUnique({ where: { id: songId } });
    
    if (song && (!song.duration || song.duration === '0')) {
      await prisma.song.update({
        where: { id: songId },
        data: { duration: body.duration }
      });
      return NextResponse.json({ success: true, updated: true });
    }

    return NextResponse.json({ success: true, updated: false });
  } catch (error) {
    console.error('Song Duration PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update song duration' }, { status: 500 });
  }
}
