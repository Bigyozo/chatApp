import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

const client = new SSMClient({
  ...(process.env.AWS_REGION ? { region: process.env.AWS_REGION } : {}),
});

export interface CognitoConfig {
  authority: string;
  clientId: string;
  redirectUrl: string;
}

let cache: CognitoConfig | null = null;

export async function getCognitoConfig(): Promise<CognitoConfig> {
  if (cache) return cache;

  const { Parameters } = await client.send(
    new GetParametersCommand({
      Names: [
        '/chatapp/COGNITO_AUTHORITY',
        '/chatapp/COGNITO_CLIENT_ID',
        '/chatapp/REDIRECT_URL',
      ],
      WithDecryption: true,
    })
  );

  const get = (name: string) => {
    const p = Parameters?.find((p) => p.Name === name);
    if (!p?.Value) throw new Error(`SSM parameter not found: ${name}`);
    return p.Value;
  };

  cache = {
    authority: get('/chatapp/COGNITO_AUTHORITY'),
    clientId: get('/chatapp/COGNITO_CLIENT_ID'),
    redirectUrl: get('/chatapp/REDIRECT_URL'),
  };
  return cache;
}
