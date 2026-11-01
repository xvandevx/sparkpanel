/**
 * Раздел «Пользователи»: учётные записи сотрудников «Фаркоп.ру».
 *
 * Заводятся только обычные пользователи — root в системе один и создаётся
 * первичной настройкой. Удаления в API нет, поэтому неактивные записи —
 * это `isActive: false`, а не отсутствие строки.
 *
 * Идемпотентность: запись ищется по email (API хранит его в нижнем регистре).
 * Существующие учётные записи сид не трогает — ни имя, ни пароль, ни доступ.
 *
 * Пароли ниже — ЛОКАЛЬНЫЕ ТЕСТОВЫЕ учётные данные демо-стенда, у каждого свой.
 * Этот файл и есть место, где они хранятся; в лог они не выводятся.
 */
import { get, post, log } from './lib.mjs';

const SECTION = 'users';

const USERS = [
  {
    email: 'manager@farkop.ru',
    name: 'Ольга Сергеевна Кравченко',
    password: 'Farkop-Mgr-2026!',
    isActive: true,
  },
  {
    email: 'editor@farkop.ru',
    name: 'Дмитрий Андреевич Белов',
    password: 'Kontent-Edit-71',
    isActive: true,
  },
  {
    email: 'seo@farkop.ru',
    name: 'Анастасия Игоревна Лебедева',
    password: 'SeoMeta#4829',
    isActive: true,
  },
  {
    email: 'montazh@farkop.ru',
    name: 'Алексей Викторович Гончаров',
    password: 'Ustanovka-Tow-55',
    isActive: true,
  },
  {
    email: 'buh@farkop.ru',
    name: 'Татьяна Николаевна Морозова',
    password: 'Buh-Schet-2026',
    isActive: true,
  },
  {
    email: 'sklad@farkop.ru',
    name: 'Руслан Ильдарович Хасанов',
    password: 'Sklad-Ostatki-38',
    isActive: true,
  },
  {
    email: 'e.smirnova@farkop.ru',
    name: 'Екатерина Павловна Смирнова',
    password: 'Smirnova-Old-904',
    isActive: false,
  },
  {
    email: 'v.orlov@farkop.ru',
    name: 'Виктор Сергеевич Орлов',
    password: 'Orlov-Uvolen-617',
    isActive: false,
  },
];

const normalize = (email) => email.trim().toLowerCase();

export default async function seed() {
  const existing = await get('/users');
  const known = new Set(existing.map((user) => normalize(user.email)));

  let created = 0;
  for (const user of USERS) {
    if (known.has(normalize(user.email))) {
      log(SECTION, `есть: ${user.email}`);
      continue;
    }
    try {
      await post('/users', user);
    } catch (error) {
      // Гонка с параллельным запуском или запись появилась между запросами:
      // 409 «email занят» значит, что нужная учётная запись уже есть.
      if (error.status === 409) {
        log(SECTION, `есть (409): ${user.email}`);
        continue;
      }
      throw error;
    }
    known.add(normalize(user.email));
    created += 1;
    log(SECTION, `создан: ${user.email} — ${user.name}${user.isActive ? '' : ' (без доступа)'}`);
  }

  log(SECTION, `создано ${created}, всего учётных записей ${known.size}`);
  return { created };
}
