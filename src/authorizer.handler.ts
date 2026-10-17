import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from 'aws-lambda';

import { validarToken } from './jwt';
import { getSecret } from './secrets';

type Resultado = APIGatewaySimpleAuthorizerWithContextResult<
  { sub: string; cpf: string } | undefined
>;

/** Lambda authorizer (HTTP API, payload 2.0, simple response) das rotas /publico/*. */
export async function handler(event: APIGatewayRequestAuthorizerEventV2): Promise<Resultado> {
  const negado: Resultado = { isAuthorized: false, context: undefined };

  const auth = event.headers?.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return negado;

  try {
    const secret = await getSecret(process.env.JWT_SECRET_ID ?? 'oficina-mecanica/JWT_SECRET');
    const payload = validarToken(secret, auth.slice(7));
    return { isAuthorized: true, context: { sub: payload.sub, cpf: payload.cpf } };
  } catch {
    return negado;
  }
}
