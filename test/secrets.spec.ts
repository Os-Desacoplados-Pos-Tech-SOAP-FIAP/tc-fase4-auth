const send = jest.fn();

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({ send })),
  GetSecretValueCommand: jest.fn((input: unknown) => input),
}));

import { getSecret } from '../src/secrets';

describe('getSecret', () => {
  beforeEach(() => send.mockReset());

  it('lê o segredo no Secrets Manager e usa cache nas chamadas seguintes', async () => {
    send.mockResolvedValue({ SecretString: 'valor-1' });
    expect(await getSecret('teste/CACHE')).toBe('valor-1');
    expect(await getSecret('teste/CACHE')).toBe('valor-1');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ SecretId: 'teste/CACHE' });
  });

  it('lança erro quando o segredo não tem valor', async () => {
    send.mockResolvedValue({});
    await expect(getSecret('teste/VAZIO')).rejects.toThrow('Secret teste/VAZIO sem valor');
  });
});
