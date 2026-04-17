import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const COGNITO_AUTHORITY = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY!;

// JWKS はモジュールロード時に一度だけ初期化し、レスポンスをキャッシュする
const JWKS = createRemoteJWKSet(
    new URL(`${COGNITO_AUTHORITY}/.well-known/jwks.json`)
);

/**
 * Authorization ヘッダーの Bearer トークンを Cognito JWKS で検証し、userId (sub) を返す
 * トークンが無効な場合は例外を投げる
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, JWKS, {
        issuer: COGNITO_AUTHORITY,
    });
    if (!payload.sub) throw new Error('Token missing sub claim');
    return payload.sub;
}
