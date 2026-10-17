import jwt from 'jsonwebtoken';

export interface ClienteTokenPayload {
  sub: string;
  cpf: string;
  scope: 'CLIENTE';
}

/** JWT HS256 com o MESMO JWT_SECRET do app — claims do contrato do ADR 001. */
export function emitirToken(secret: string, payload: ClienteTokenPayload): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });
}

export function validarToken(secret: string, token: string): ClienteTokenPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || decoded.scope !== 'CLIENTE') {
    throw new Error('Escopo inválido');
  }
  return decoded as unknown as ClienteTokenPayload;
}
