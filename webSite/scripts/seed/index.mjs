/**
 * Демо-данные для локальной панели: по 5–10 записей в каждом разделе, дерево
 * страниц и свойства записей у всех списков. Сид идемпотентный — повторный
 * запуск ничего не дублирует (записи ищутся по коду, email, имени хоста).
 *
 *   node scripts/seed/index.mjs              — все разделы по порядку
 *   node scripts/seed/index.mjs pages forms  — только указанные
 *
 * Токен root подписывается сам (`token.mjs`, только локально) или берётся из
 * `SEED_TOKEN`. Адрес API — `SEED_API`, по умолчанию http://localhost:3400/api.
 */
import { setToken } from './lib.mjs';
import { rootToken } from './token.mjs';

/**
 * Порядок важен: свойства ссылаются на файлы и записи других разделов —
 * поэтому они последними.
 */
const SECTIONS = [
  'files',
  'pages',
  'forms',
  'users',
  'domains',
  'infoblocks',
  'properties-pages',
  'properties-panel',
  'properties-infoblocks',
  'properties-files',
];

const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !SECTIONS.includes(name));
if (unknown.length) {
  console.error(`Неизвестные разделы: ${unknown.join(', ')}. Есть: ${SECTIONS.join(', ')}`);
  process.exit(1);
}

if (!process.env.SEED_TOKEN) setToken(await rootToken());

for (const name of requested.length ? requested : SECTIONS) {
  const { default: seed } = await import(`./${name}.mjs`);
  console.log(`\n=== ${name}`);
  await seed();
}
