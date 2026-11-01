/**
 * Токен главного администратора для сида — ТОЛЬКО для локальной разработки.
 *
 * Пароль root нам неизвестен и не нужен: токен подписывается тем же ключом
 * (`PRIVATE_KEY` из `backend/.env`), что и у бэкенда, а id и email root берутся
 * из локальной базы. На проде этого скрипта нет и быть не должно.
 *
 *   node scripts/seed/token.mjs   — напечатать токен
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '../../backend');
// Зависимости — бэкенда: у скриптов своего package.json нет
const require = createRequire(path.join(backendDir, 'package.json'));

export async function rootToken() {
  require('dotenv').config({ path: path.join(backendDir, '.env') });
  const { Client } = require('pg');
  const jwt = require('jsonwebtoken');

  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      'select id, email from users where "isRoot" order by id limit 1',
    );
    if (!rows.length) throw new Error('В базе нет root: сначала пройдите первичную настройку в /admin');
    const { id, email } = rows[0];
    return jwt.sign({ id, email, isRoot: true }, process.env.PRIVATE_KEY, { expiresIn: '8h' });
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(await rootToken());
}
