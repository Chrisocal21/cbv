import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const authObj = await auth()
  const cookieHeader = req.headers.get('cookie') ?? ''
  const clerkCookies = cookieHeader.split(';')
    .map(c => c.trim())
    .filter(c => c.startsWith('__clerk') || c.startsWith('__session') || c.startsWith('__client'))
    .map(c => c.split('=')[0])
  const authHeaders: Record<string, string> = {}
  req.headers.forEach((val, key) => {
    if (key.includes('clerk') || key.includes('auth')) authHeaders[key] = val.slice(0, 40)
  })
  return NextResponse.json({
    userId: authObj.userId,
    sessionId: authObj.sessionId,
    clerkCookiesPresent: clerkCookies,
    clerkAuthHeaders: authHeaders,
  })
}
