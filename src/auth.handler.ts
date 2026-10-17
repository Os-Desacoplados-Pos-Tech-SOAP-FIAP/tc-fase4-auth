import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { cpfValido, limparCpf } from './cpf';
import { buscarClientePorCpf } from './db';
import { emitirToken } from './jwt';
import { getSecret } from './secrets';

const json = (statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * POST /auth — autentica o cliente pelo CPF em 3 etapas (requisito da fase):
 * 1. valida formato/dígitos; 2. consulta existência na base; 3. emite JWT escopo CLIENTE.
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

  const databaseUrl = await getSecret(
    process.env.DATABASE_URL_SECRET_ID ?? 'oficina-mecanica/DATABASE_URL',
  );
  const cliente = await buscarClientePorCpf(databaseUrl, cpf);
  if (!cliente) {
    return json(404, { code: 'CLIENTE_NAO_ENCONTRADO', message: 'Cliente não cadastrado' });
  }

  const jwtSecret = await getSecret(process.env.JWT_SECRET_ID ?? 'oficina-mecanica/JWT_SECRET');
  const accessToken = emitirToken(jwtSecret, { sub: cliente.id, cpf, scope: 'CLIENTE' });

  return json(200, {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    cliente: { id: cliente.id, nome: cliente.nome },
  });
}
