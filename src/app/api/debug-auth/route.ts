import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const authObj = await getAuth(req)
  return NextResponse.json({ userId: authObj.userId, sessionId: authObj.sessionId })
}
