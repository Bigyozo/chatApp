import { NextResponse } from 'next/server';

/** アプリケーションの死活監視エンドポイント */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'chat-app',
    },
    { status: 200 }
  );
}
