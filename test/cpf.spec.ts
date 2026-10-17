import { limparCpf, cpfValido } from '../src/cpf';

describe('cpfValido', () => {
  it('aceita CPF válido com máscara', () => {
    expect(cpfValido(limparCpf('529.982.247-25'))).toBe(true);
  });
  it('aceita CPF válido sem máscara', () => {
    expect(cpfValido('52998224725')).toBe(true);
  });
  it('rejeita dígito verificador errado', () => {
    expect(cpfValido('52998224724')).toBe(false);
  });
  it('rejeita sequência repetida', () => {
    expect(cpfValido('11111111111')).toBe(false);
  });
  it('rejeita tamanho errado e vazio', () => {
    expect(cpfValido('123')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });
});
