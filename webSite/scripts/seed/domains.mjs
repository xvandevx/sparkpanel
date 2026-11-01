/**
 * Домены сайта «Фаркоп.ру»: поддомены регионов, магазина, опта, мобильной
 * версии и второй бренд. Основной домен (farkop.ru) заведён руками — его не
 * трогаем. Домены ищутся по имени хоста, повторный запуск ничего не дублирует.
 *
 * Заодно — название сайта в настройках: вписываем, только если оно пустое.
 */
import { ensure, get, log, patch, post } from './lib.mjs';

const SECTION = 'domains';

/** Полные имена хостов: так результат не зависит от того, как назван основной домен. */
const DOMAINS = [
  {
    host: 'www.farkop.ru',
    note: 'Зеркало с www: nginx отдаёт 301-редирект на farkop.ru, чтобы поисковики не считали сайт дублем.',
  },
  {
    host: 'msk.farkop.ru',
    note: 'Витрина для Москвы и области: цены с установкой в центрах на Варшавском шоссе и в Химках, запись на монтаж день в день.',
  },
  {
    host: 'spb.farkop.ru',
    note: 'Санкт-Петербург и Ленинградская область: склад в Парнасе, установочный центр на Софийской улице, доставка по КАД бесплатно.',
  },
  {
    host: 'ekb.farkop.ru',
    note: 'Екатеринбург и Урал: самовывоз с ул. Монтёрской, отправка в Челябинск, Тюмень и Пермь транспортными компаниями.',
  },
  {
    host: 'shop.farkop.ru',
    note: 'Корзина и оформление заказа: оплата картой и по СБП, отслеживание доставки. Каталог живёт на основном домене.',
  },
  {
    host: 'opt.farkop.ru',
    note: 'Оптовый портал для СТО и дилеров: прайс-листы с оптовыми ценами, остатки по складам, личный кабинет с отсрочкой платежа.',
  },
  {
    host: 'm.farkop.ru',
    isActive: false,
    note: 'Старая мобильная версия. После перехода на адаптивную вёрстку отключена; домен держим до конца оплаченного периода, потом снимем.',
  },
  {
    host: 'towbar-shop.ru',
    note: 'Второй бренд — магазин фаркопов для зарубежных покупателей и маркетплейсов. Тот же каталог, отдельный дизайн и счётчики.',
  },
];

const SITE_NAME = 'Фаркоп.ру';

export default async function seed() {
  const existing = await get('/domains');
  let created = 0;

  for (const [index, domain] of DOMAINS.entries()) {
    const { item, created: isNew } = await ensure(
      existing,
      (row) => row.host === domain.host,
      () =>
        post('/domains', {
          host: domain.host,
          isActive: domain.isActive ?? true,
          note: domain.note,
          position: (index + 1) * 100,
        }),
    );
    if (isNew) {
      created += 1;
      existing.push(item);
    }
    log(SECTION, `${isNew ? 'создан' : 'уже есть'}: ${item.host}${item.isActive ? '' : ' (неактивен)'}`);
  }

  const settings = await get('/settings');
  if (!settings?.siteName?.trim()) {
    await patch('/settings', { siteName: SITE_NAME });
    log(SECTION, `название сайта: «${SITE_NAME}»`);
  } else {
    log(SECTION, `название сайта уже задано: «${settings.siteName}» — не трогаем`);
  }

  log(SECTION, `создано доменов: ${created}, всего в списке: ${existing.length}`);
  return { created };
}
