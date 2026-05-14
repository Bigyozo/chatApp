import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { NextRequest } from 'next/server';
import { getCognitoConfig } from './ssm';

let jwks: JWTVerifyGetKey | null = null;
let jwksAuthority: string | null = null;

async function getJwks(): Promise<{ jwks: JWTVerifyGetKey; authority: string }> {
    const { authority } = await getCognitoConfig();
    if (!jwks || jwksAuthority !== authority) {
        jwks = createRemoteJWKSet(new URL(`${authority}/.well-known/jwks.json`));
        jwksAuthority = authority;
    }
    return { jwks, authority };
}

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
    const { jwks: keySet, authority } = await getJwks();
    const { payload } = await jwtVerify(token, keySet, {
        issuer: authority,
    });
    if (!payload.sub) throw new Error('Token missing sub claim');
    return payload.sub;
}
