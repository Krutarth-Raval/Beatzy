import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { isPublic } = await request.json();

    // Verify ownership
    const playlist = await prisma.playlist.findUnique({
      where: { id }
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id },
      data: { isPublic: Boolean(isPublic) }
    });

    return NextResponse.json(updatedPlaylist);
  } catch (error) {
    console.error('Playlist Visibility PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update playlist visibility' }, { status: 500 });
  }
}
