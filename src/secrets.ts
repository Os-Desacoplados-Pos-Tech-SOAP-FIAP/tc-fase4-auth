import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
const cache = new Map<string, string>();

export async function getSecret(secretId: string): Promise<string> {
  const cached = cache.get(secretId);
  if (cached) return cached;
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) throw new Error(`Secret ${secretId} sem valor`);
  cache.set(secretId, res.SecretString);
  return res.SecretString;
}
