import jwt from 'jsonwebtoken';
import { emitirToken, validarToken } from '../src/jwt';

const SEGREDO = 'segredo-de-teste-com-tamanho-ok';

describe('jwt do cliente', () => {
  it('emite sub e perfil CLIENTE, sem CPF, com validade de 1h', () => {
    const token = emitirToken(SEGREDO, '0c000000-0000-4000-8000-000000000001');
    const payload = jwt.verify(token, SEGREDO) as jwt.JwtPayload;
    expect(payload.sub).toBe('0c000000-0000-4000-8000-000000000001');
    expect(payload.perfil).toBe('CLIENTE');
    expect(payload).not.toHaveProperty('cpf');
    expect(payload.exp! - payload.iat!).toBe(3600);
  });

  it('aceita só perfil CLIENTE', () => {
    const funcionario = jwt.sign({ sub: 'u1', perfil: 'ADMINISTRADOR' }, SEGREDO);
    expect(() => validarToken(SEGREDO, funcionario)).toThrow();
  });

  it('recusa algoritmo diferente de HS256 e segredo errado', () => {
    expect(() => validarToken(SEGREDO, emitirToken('outro-segredo-qualquer', 'c1'))).toThrow();
    const none = jwt.sign({ sub: 'c1', perfil: 'CLIENTE' }, '', { algorithm: 'none' });
    expect(() => validarToken(SEGREDO, none)).toThrow();
  });
});
