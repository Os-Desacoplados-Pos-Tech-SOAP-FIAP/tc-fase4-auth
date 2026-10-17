jest.mock('../src/secrets', () => ({ getSecret: jest.fn().mockResolvedValue('segredo-teste') }));

import jwt from 'jsonwebtoken';

import { handler } from '../src/authorizer.handler';

const evento = (authHeader?: string) =>
  ({ headers: authHeader ? { authorization: authHeader } : {} }) as never;

describe('authorizer.handler', () => {
  it('autoriza token válido de perfil CLIENTE e propaga sub e perfil no contexto', async () => {
    const token = jwt.sign({ sub: 'abc-1', perfil: 'CLIENTE' }, 'segredo-teste');
    const res = await handler(evento(`Bearer ${token}`));
    expect(res.isAuthorized).toBe(true);
    expect(res.context).toEqual({ sub: 'abc-1', perfil: 'CLIENTE' });
  });

  it('nega token de funcionário', async () => {
    const token = jwt.sign({ sub: 'u1', perfil: 'ATENDENTE' }, 'segredo-teste');
    const res = await handler(evento(`Bearer ${token}`));
    expect(res.isAuthorized).toBe(false);
  });

  it('nega sem header e com header sem Bearer', async () => {
    expect((await handler(evento())).isAuthorized).toBe(false);
    expect((await handler(evento('Token abc'))).isAuthorized).toBe(false);
  });

  it('nega token assinado com segredo errado', async () => {
    const forjado = jwt.sign({ sub: 'abc-1', perfil: 'CLIENTE' }, 'outro-segredo');
    expect((await handler(evento(`Bearer ${forjado}`))).isAuthorized).toBe(false);
  });
});
