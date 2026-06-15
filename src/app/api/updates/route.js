import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const updates = await prisma.update.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { icon, title, description } = await request.json();

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const newUpdate = await prisma.update.create({
      data: {
        icon: icon || 'Star', // Default icon if none provided
        title,
        description,
      },
    });

    return NextResponse.json(newUpdate, { status: 201 });
  } catch (error) {
    console.error('Error creating update:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Update ID is required' }, { status: 400 });
    }

    await prisma.update.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
