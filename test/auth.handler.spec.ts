import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const SEGREDOS: Record<string, string> = {
  'oficina-fase4/JWT_SECRET': 'segredo-jwt-teste',
  'oficina-fase4/INTERNAL_SERVICE_TOKEN': 'token-interno-teste',
};

jest.mock('../src/secrets', () => ({
  getSecret: jest.fn((id: string) => Promise.resolve(SEGREDOS[id])),
}));
jest.mock('../src/os-client', () => ({
  ...jest.requireActual('../src/os-client'),
  buscarClientePorCpf: jest.fn(),
}));

import jwt from 'jsonwebtoken';

import { handler } from '../src/auth.handler';
import { buscarClientePorCpf, OsIndisponivelError } from '../src/os-client';
import { getSecret } from '../src/secrets';

const OS_URL = 'http://alb-interno.local';
const CPF_COM_MASCARA = '529.982.247-25';
const CPF = '52998224725';

const buscar = buscarClientePorCpf as jest.Mock;
const evento = (body: unknown): APIGatewayProxyEventV2 =>
  ({ body: JSON.stringify(body) }) as APIGatewayProxyEventV2;

describe('auth.handler', () => {
  let logs: jest.SpyInstance[];

  beforeEach(() => {
    process.env.OS_INTERNAL_URL = OS_URL;
    delete process.env.JWT_SECRET_ID;
    delete process.env.INTERNAL_SERVICE_TOKEN_SECRET_ID;
    buscar.mockReset();
    logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((nivel) =>
      jest.spyOn(console, nivel).mockImplementation(() => undefined),
    );
  });

  afterEach(() => {
    const saida = JSON.stringify(logs.flatMap((spy) => spy.mock.calls));
    expect(saida).not.toContain(CPF);
    expect(saida).not.toContain(CPF_COM_MASCARA);
    logs.forEach((spy) => spy.mockRestore());
  });

  it('devolve 400 para body sem cpf ou não-JSON', async () => {
    expect((await handler(evento({}))).statusCode).toBe(400);
    const res = await handler({ body: 'nao-e-json' } as APIGatewayProxyEventV2);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).code).toBe('BODY_INVALIDO');
  });

  it('devolve 400 para CPF inválido', async () => {
    const res = await handler(evento({ cpf: '123' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).code).toBe('CPF_INVALIDO');
  });

  it('devolve 404 quando o cliente não existe no OS', async () => {
    buscar.mockResolvedValue(null);
    const res = await handler(evento({ cpf: CPF_COM_MASCARA }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body!).code).toBe('CLIENTE_NAO_ENCONTRADO');
  });

  it('devolve 503 quando o OS está indisponível', async () => {
    buscar.mockRejectedValue(new OsIndisponivelError('OS respondeu 500'));
    const res = await handler(evento({ cpf: CPF_COM_MASCARA }));
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body!)).toEqual({
      code: 'OS_INDISPONIVEL',
      message: 'Serviço de clientes indisponível',
    });
  });

  it('devolve 500 e registra a configuração ausente quando falta OS_INTERNAL_URL', async () => {
    delete process.env.OS_INTERNAL_URL;
    const res = await handler(evento({ cpf: CPF_COM_MASCARA }));
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body!).code).toBe('CONFIGURACAO_AUSENTE');
    expect(buscar).not.toHaveBeenCalled();
    expect(JSON.stringify(logs.flatMap((spy) => spy.mock.calls))).toContain('OS_INTERNAL_URL');
  });

  it.each([
    ['token interno', 'oficina-fase4/INTERNAL_SERVICE_TOKEN'],
    ['JWT_SECRET', 'oficina-fase4/JWT_SECRET'],
  ])('devolve 500 estruturado quando falha ao ler o segredo %s', async (_nome, secretId) => {
    const getSecretMock = getSecret as jest.Mock;
    getSecretMock.mockImplementation((id: string) =>
      id === secretId
        ? Promise.reject(new Error('AccessDeniedException'))
        : Promise.resolve(SEGREDOS[id]),
    );
    buscar.mockResolvedValue({ id: 'abc-1', nome: 'Maria' });

    try {
      const res = await handler(evento({ cpf: CPF_COM_MASCARA }));

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body!)).toEqual({
        code: 'SEGREDO_INDISPONIVEL',
        message: expect.any(String),
      });
      const registros = (console.error as jest.Mock).mock.calls.map(([linha]) =>
        JSON.parse(linha as string),
      );
      expect(registros).toContainEqual({
        level: 'error',
        code: 'SEGREDO_INDISPONIVEL',
        message: expect.stringContaining(secretId),
      });
      const saida = JSON.stringify(logs.flatMap((spy) => spy.mock.calls));
      Object.values(SEGREDOS).forEach((valor) => expect(saida).not.toContain(valor));
    } finally {
      getSecretMock.mockImplementation((id: string) => Promise.resolve(SEGREDOS[id]));
    }
  });

  it('devolve 200 com JWT {sub, perfil: CLIENTE} e consulta o OS com o token interno', async () => {
    buscar.mockResolvedValue({ id: 'abc-1', nome: 'Maria' });
    const res = await handler(evento({ cpf: CPF_COM_MASCARA }));

    expect(res.statusCode).toBe(200);
    expect(buscar).toHaveBeenCalledWith(OS_URL, 'token-interno-teste', CPF);
    const body = JSON.parse(res.body!);
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBe(3600);
    expect(body.cliente).toEqual({ id: 'abc-1', nome: 'Maria' });
    const claims = jwt.verify(body.access_token, 'segredo-jwt-teste') as jwt.JwtPayload;
    expect(claims.sub).toBe('abc-1');
    expect(claims.perfil).toBe('CLIENTE');
    expect(claims).not.toHaveProperty('cpf');
  });
});
