import { buscarClientePorCpf, OsIndisponivelError } from '../src/os-client';

const BASE = 'http://alb-interno.local';
const TOKEN = 'token-interno-teste';

const resposta = (status: number, body?: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('os-client', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('devolve id e nome quando o OS responde 200, descartando o cpf', async () => {
    fetchSpy.mockResolvedValue(resposta(200, { id: 'c1', nome: 'Maria', cpf: '52998224725' }));
    const cliente = await buscarClientePorCpf(BASE, TOKEN, '52998224725');
    expect(cliente).toEqual({ id: 'c1', nome: 'Maria' });
  });

  it('devolve null quando o OS responde 404', async () => {
    fetchSpy.mockResolvedValue(resposta(404, { message: 'não encontrado' }));
    expect(await buscarClientePorCpf(BASE, TOKEN, '52998224725')).toBeNull();
  });

  it.each([401, 500])('lança OsIndisponivelError quando o OS responde %i', async (status) => {
    fetchSpy.mockResolvedValue(resposta(status, { message: 'erro' }));
    await expect(buscarClientePorCpf(BASE, TOKEN, '52998224725')).rejects.toBeInstanceOf(
      OsIndisponivelError,
    );
  });

  it('lança OsIndisponivelError no timeout', async () => {
    fetchSpy.mockRejectedValue(new DOMException('The operation was aborted', 'TimeoutError'));
    await expect(buscarClientePorCpf(BASE, TOKEN, '52998224725')).rejects.toBeInstanceOf(
      OsIndisponivelError,
    );
  });

  it('chama a rota interna com X-Internal-Token, CPF codificado e timeout', async () => {
    fetchSpy.mockResolvedValue(resposta(404));
    await buscarClientePorCpf(BASE, TOKEN, '529/82');
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/os/internal/clientes/cpf/529%2F82`);
    expect(init.headers).toEqual({ 'X-Internal-Token': TOKEN });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
