import { Client } from 'pg';

export interface ClienteRow {
  id: string;
  nome: string;
  tipo: string;
}

/**
 * Busca o cliente pelo CPF (coluna `documento`, dígitos sem máscara).
 * Uma conexão por invocação — escala da demo não justifica RDS Proxy (ADR 001).
 * A URL vem no formato do Prisma (`?schema=public`) — o pg não conhece o parâmetro,
 * então removemos a query string. SSL exigido pelo RDS PG16 (rds.force_ssl).
 */
export async function buscarClientePorCpf(
  databaseUrl: string,
  cpf: string,
): Promise<ClienteRow | null> {
  const connectionString = databaseUrl.split('?')[0];
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query<ClienteRow>(
      'SELECT id, nome, tipo FROM "Cliente" WHERE documento = $1 LIMIT 1',
      [cpf],
    );
    return res.rows[0] ?? null;
  } finally {
    await client.end();
  }
}
