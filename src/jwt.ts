import jwt from 'jsonwebtoken';

export const PERFIL_CLIENTE = 'CLIENTE';
export const VALIDADE_SEGUNDOS = 3600;

export interface ClienteTokenPayload {
  sub: string;
  perfil: typeof PERFIL_CLIENTE;
}

/** JWT HS256 com o mesmo JWT_SECRET dos serviços: contrato `{sub, perfil}` (spec §3). Sem CPF no token (LGPD). */
export function emitirToken(secret: string, clienteId: string): string {
  const payload: ClienteTokenPayload = { sub: clienteId, perfil: PERFIL_CLIENTE };
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: VALIDADE_SEGUNDOS });
}

export function validarToken(secret: string, token: string): ClienteTokenPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || decoded.perfil !== PERFIL_CLIENTE || !decoded.sub) {
    throw new Error('Perfil inválido');
  }
  return { sub: decoded.sub, perfil: PERFIL_CLIENTE };
}
