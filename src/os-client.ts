const TIMEOUT_MS = 3000;

export interface ClienteAutenticavel {
  id: string;
  nome: string;
}

export class OsIndisponivelError extends Error {}

/** Busca o cliente pelo CPF na rota interna do OS (o OS é o dono dos dados do cliente). */
export async function buscarClientePorCpf(
  baseUrl: string,
  tokenInterno: string,
  cpf: string,
): Promise<ClienteAutenticavel | null> {
  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/api/os/internal/clientes/cpf/${encodeURIComponent(cpf)}`, {
      headers: { 'X-Internal-Token': tokenInterno },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (erro) {
    throw new OsIndisponivelError(`OS indisponível: ${(erro as Error).message}`);
  }
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new OsIndisponivelError(`OS respondeu ${resposta.status}`);
  const { id, nome } = (await resposta.json()) as ClienteAutenticavel;
  return { id, nome };
}
