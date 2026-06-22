import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = process.env.EXTRACTOR_URL || 'http://127.0.0.1:8000';
  const startTime = Date.now();
  
  try {
    const res = await fetch(backendUrl, { signal: AbortSignal.timeout(10000) }); // 10 second timeout
    const latency = Date.now() - startTime;
    
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return NextResponse.json({
        status: 'Online',
        latency: `${latency}ms`,
        message: data?.message || 'Server is responding correctly.',
        url: backendUrl
      });
    } else {
      return NextResponse.json({
        status: 'Error',
        latency: `${latency}ms`,
        message: `HTTP Error ${res.status}: ${res.statusText}`,
        url: backendUrl
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    let statusMessage = 'Offline';
    let detailedMessage = error.message;

    if (error.message.includes('fetch failed') || error.cause?.code === 'ECONNREFUSED') {
      detailedMessage = 'Connection Refused: The server is down or unreachable.';
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      statusMessage = 'Timeout';
      detailedMessage = 'Request Timed Out: The server took too long to respond (possibly blocked or deploying).';
    }

    return NextResponse.json({
      status: statusMessage,
      latency: `${latency}ms`,
      message: detailedMessage,
      url: backendUrl
    });
  }
}
