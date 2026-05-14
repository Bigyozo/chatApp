import { NextResponse } from 'next/server';
import { getCognitoConfig } from '@/lib/ssm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getCognitoConfig();
  return NextResponse.json({
    authority: config.authority,
    clientId: config.clientId,
    redirectUrl: config.redirectUrl,
  });
}
