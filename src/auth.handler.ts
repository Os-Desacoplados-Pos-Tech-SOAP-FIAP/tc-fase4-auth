import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { cpfValido, limparCpf } from './cpf';
import { emitirToken, VALIDADE_SEGUNDOS } from './jwt';
import { buscarClientePorCpf, OsIndisponivelError } from './os-client';
import { getSecret } from './secrets';

const json = (statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** Log estruturado. Nunca recebe o CPF (LGPD). */
const logErro = (code: string, message: string): void =>
  console.error(JSON.stringify({ level: 'error', code, message }));

/**
 * POST /auth — autentica o cliente pelo CPF em 3 etapas (requisito da fase):
 * 1. valida formato/dígitos; 2. consulta o cliente na rota interna do OS; 3. emite JWT com perfil CLIENTE.
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  let cpfInput = '';
  try {
    cpfInput = JSON.parse(event.body ?? '{}').cpf ?? '';
  } catch {
    return json(400, { code: 'BODY_INVALIDO', message: 'Body deve ser JSON com o campo cpf' });
  }

  const cpf = limparCpf(cpfInput);
  if (!cpfValido(cpf)) {
    return json(400, { code: 'CPF_INVALIDO', message: 'CPF inválido' });
  }

  const osInternalUrl = process.env.OS_INTERNAL_URL;
  if (!osInternalUrl) {
    logErro('CONFIGURACAO_AUSENTE', 'Variável OS_INTERNAL_URL não configurada');
    return json(500, { code: 'CONFIGURACAO_AUSENTE', message: 'Erro de configuração' });
  }

  const tokenInterno = await getSecret(
    process.env.INTERNAL_SERVICE_TOKEN_SECRET_ID ?? 'oficina-fase4/INTERNAL_SERVICE_TOKEN',
  );

  let cliente;
  try {
    cliente = await buscarClientePorCpf(osInternalUrl, tokenInterno, cpf);
  } catch (erro) {
    if (!(erro instanceof OsIndisponivelError)) throw erro;
    logErro('OS_INDISPONIVEL', erro.message);
    return json(503, { code: 'OS_INDISPONIVEL', message: 'Serviço de clientes indisponível' });
  }
  if (!cliente) {
    return json(404, { code: 'CLIENTE_NAO_ENCONTRADO', message: 'Cliente não cadastrado' });
  }

  const jwtSecret = await getSecret(process.env.JWT_SECRET_ID ?? 'oficina-fase4/JWT_SECRET');

  return json(200, {
    access_token: emitirToken(jwtSecret, cliente.id),
    token_type: 'Bearer',
    expires_in: VALIDADE_SEGUNDOS,
    cliente: { id: cliente.id, nome: cliente.nome },
  });
}
