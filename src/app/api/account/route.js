import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prisma cascades relations if configured, but to be safe, delete history first
    await prisma.history.deleteMany({
      where: { userId: session.user.id }
    });

    // Delete accounts (OAuth bindings)
    await prisma.account.deleteMany({
      where: { userId: session.user.id }
    });

    // Delete sessions
    await prisma.session.deleteMany({
      where: { userId: session.user.id }
    });

    // Delete user
    await prisma.user.delete({
      where: { id: session.user.id }
    });

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Account DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
