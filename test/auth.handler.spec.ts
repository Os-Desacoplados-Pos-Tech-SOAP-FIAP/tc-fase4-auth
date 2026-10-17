import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../src/secrets', () => ({ getSecret: jest.fn().mockResolvedValue('segredo-teste') }));
jest.mock('../src/db', () => ({ buscarClientePorCpf: jest.fn() }));

import jwt from 'jsonwebtoken';

import { handler } from '../src/auth.handler';
import { buscarClientePorCpf } from '../src/db';

const evento = (body: unknown): APIGatewayProxyEventV2 =>
  ({ body: JSON.stringify(body) }) as APIGatewayProxyEventV2;

describe('auth.handler', () => {
  it('devolve 400 para CPF inválido', async () => {
    const res = await handler(evento({ cpf: '123' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).code).toBe('CPF_INVALIDO');
  });

  it('devolve 404 quando cliente não existe', async () => {
    (buscarClientePorCpf as jest.Mock).mockResolvedValue(null);
    const res = await handler(evento({ cpf: '529.982.247-25' }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body!).code).toBe('CLIENTE_NAO_ENCONTRADO');
  });

  it('devolve 200 com JWT escopo CLIENTE quando cliente existe', async () => {
    (buscarClientePorCpf as jest.Mock).mockResolvedValue({ id: 'abc-1', nome: 'Maria', tipo: 'PF' });
    const res = await handler(evento({ cpf: '529.982.247-25' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    const claims = jwt.verify(body.access_token, 'segredo-teste') as Record<string, unknown>;
    expect(claims.sub).toBe('abc-1');
    expect(claims.cpf).toBe('52998224725');
    expect(claims.scope).toBe('CLIENTE');
    expect(body.token_type).toBe('Bearer');
  });

  it('devolve 400 para body sem cpf ou não-JSON', async () => {
    expect((await handler(evento({}))).statusCode).toBe(400);
    const res = await handler({ body: 'nao-e-json' } as APIGatewayProxyEventV2);
    expect(res.statusCode).toBe(400);
  });
});
