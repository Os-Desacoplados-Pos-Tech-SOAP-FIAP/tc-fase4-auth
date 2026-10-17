jest.mock('../src/secrets', () => ({ getSecret: jest.fn().mockResolvedValue('segredo-teste') }));

import jwt from 'jsonwebtoken';

import { handler } from '../src/authorizer.handler';

const evento = (authHeader?: string) =>
  ({ headers: authHeader ? { authorization: authHeader } : {} }) as never;

describe('authorizer.handler', () => {
  it('autoriza token válido de escopo CLIENTE e propaga contexto', async () => {
    const token = jwt.sign({ sub: 'abc-1', cpf: '52998224725', scope: 'CLIENTE' }, 'segredo-teste');
    const res = await handler(evento(`Bearer ${token}`));
    expect(res.isAuthorized).toBe(true);
    expect(res.context).toEqual({ sub: 'abc-1', cpf: '52998224725' });
  });

  it('nega token de outro escopo (ex.: funcionário)', async () => {
    const token = jwt.sign({ sub: 'u1', email: 'x@y.z', perfil: 'ATENDENTE' }, 'segredo-teste');
    const res = await handler(evento(`Bearer ${token}`));
    expect(res.isAuthorized).toBe(false);
  });

  it('nega sem header, header malformado e assinatura inválida', async () => {
    expect((await handler(evento())).isAuthorized).toBe(false);
    expect((await handler(evento('Token abc'))).isAuthorized).toBe(false);
    const forjado = jwt.sign({ scope: 'CLIENTE' }, 'outro-segredo');
    expect((await handler(evento(`Bearer ${forjado}`))).isAuthorized).toBe(false);
  });
});
