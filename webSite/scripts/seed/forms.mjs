/**
 * Веб-формы «Фаркоп.ру»: заявки на установку, обратный звонок, подбор фаркопа,
 * отзывы, гарантия, оптовые клиенты. Формы ищутся по коду, поля — по коду
 * внутри своей формы, поэтому повторный запуск ничего не дублирует.
 *
 * Существующая форма `feedback` не трогается: поля ей добавляются, только если
 * своих у неё нет (или есть лишь те, что завёл этот же сид, — дозаполняем после
 * прерванного запуска).
 */
import { get, post, ensure, log } from './lib.mjs';

const SECTION = 'forms';

/** Поля для пользовательской формы «Обратная связь», если она пустая. */
const FEEDBACK_FIELDS = [
  { code: 'name', label: 'Ваше имя', type: 'text', placeholder: 'Как к вам обращаться', isRequired: true },
  { code: 'email', label: 'E-mail', type: 'email', placeholder: 'mail@example.ru', isRequired: true },
  { code: 'phone', label: 'Телефон', type: 'phone', placeholder: '+7 (900) 000-00-00' },
  {
    code: 'topic',
    label: 'Тема обращения',
    type: 'select',
    options: ['Вопрос по заказу', 'Наличие товара', 'Доставка и оплата', 'Сотрудничество', 'Другое'],
    isRequired: true,
  },
  {
    code: 'message',
    label: 'Сообщение',
    type: 'textarea',
    placeholder: 'Опишите ваш вопрос — ответим в течение рабочего дня',
    isRequired: true,
  },
  { code: 'agree', label: 'Согласен на обработку персональных данных', type: 'checkbox', isRequired: true },
];

const FORMS = [
  {
    code: 'install-request',
    name: 'Заявка на установку',
    description:
      'Запишитесь на установку фаркопа в одном из наших сервисных центров. Мастер перезвонит, уточнит модель авто и подтвердит время.',
    notifyEmail: 'service@farkop.ru',
    successMessage:
      'Спасибо! Заявка принята. Мастер сервисного центра свяжется с вами в течение часа в рабочее время, чтобы подтвердить дату установки.',
    submitLabel: 'Записаться на установку',
    isActive: true,
    fields: [
      { code: 'name', label: 'Имя', type: 'text', placeholder: 'Иван', isRequired: true },
      { code: 'phone', label: 'Телефон', type: 'phone', placeholder: '+7 (900) 000-00-00', isRequired: true },
      { code: 'car_model', label: 'Марка и модель автомобиля', type: 'text', placeholder: 'Kia Sportage, 2021', isRequired: true },
      {
        code: 'service_center',
        label: 'Сервисный центр',
        type: 'select',
        options: [
          'Москва, Варшавское ш., 170Г',
          'Москва, ул. Вольская 2-я, 1к1',
          'Химки, Ленинградское ш., 2с1',
          'Санкт-Петербург, Пулковское ш., 40к4',
          'Казань, ул. Тэцевская, 4Б',
        ],
        isRequired: true,
      },
      {
        code: 'electrics',
        label: 'Тип электрики',
        type: 'select',
        options: ['Штатная (смарт-коннект)', 'Универсальная', 'Пока не знаю — нужна консультация'],
      },
      { code: 'preferred_date', label: 'Желаемая дата и время', type: 'text', placeholder: 'Например, суббота после 12:00' },
      { code: 'comment', label: 'Комментарий', type: 'textarea', placeholder: 'Уже купили фаркоп у нас? Укажите номер заказа' },
      { code: 'agree', label: 'Согласен на обработку персональных данных', type: 'checkbox', isRequired: true },
    ],
  },
  {
    code: 'callback',
    name: 'Обратный звонок',
    description: 'Оставьте номер — менеджер перезвонит за 15 минут и ответит на вопросы по подбору и установке.',
    notifyEmail: 'zakaz@farkop.ru',
    successMessage: 'Готово! Менеджер перезвонит вам в течение 15 минут (ежедневно с 9:00 до 21:00 по Москве).',
    submitLabel: 'Перезвоните мне',
    isActive: true,
    fields: [
      { code: 'name', label: 'Как к вам обращаться', type: 'text', placeholder: 'Имя', isRequired: true },
      { code: 'phone', label: 'Телефон', type: 'phone', placeholder: '+7 (900) 000-00-00', isRequired: true },
      {
        code: 'call_time',
        label: 'Удобное время звонка',
        type: 'select',
        options: ['Как можно скорее', 'С 9:00 до 12:00', 'С 12:00 до 17:00', 'С 17:00 до 21:00'],
      },
    ],
  },
  {
    code: 'towbar-selection',
    name: 'Подбор фаркопа по авто',
    description:
      'Не уверены, какой фаркоп подойдёт? Укажите автомобиль — подберём совместимые модели с учётом нагрузки и типа шара.',
    notifyEmail: 'podbor@farkop.ru',
    successMessage:
      'Спасибо! Специалист подберёт подходящие фаркопы и пришлёт варианты с ценами на указанную почту в течение двух часов.',
    submitLabel: 'Подобрать фаркоп',
    isActive: true,
    fields: [
      { code: 'car_brand', label: 'Марка', type: 'text', placeholder: 'Toyota', isRequired: true },
      { code: 'car_model', label: 'Модель', type: 'text', placeholder: 'RAV4', isRequired: true },
      { code: 'car_year', label: 'Год выпуска', type: 'text', placeholder: '2020', isRequired: true },
      {
        code: 'body_type',
        label: 'Тип кузова',
        type: 'select',
        options: ['Седан', 'Хэтчбек', 'Универсал', 'Кроссовер / внедорожник', 'Пикап', 'Минивэн / фургон'],
      },
      {
        code: 'towbar_type',
        label: 'Тип фаркопа',
        type: 'select',
        options: ['Съёмный шар (быстросъёмный)', 'Сварной (несъёмный)', 'Фланцевый', 'Скрытый (вертикальный)', 'Посоветуйте'],
      },
      {
        code: 'trailer_purpose',
        label: 'Что планируете буксировать',
        type: 'select',
        options: ['Лёгкий прицеп до 750 кг', 'Прицеп для лодки или гидроцикла', 'Дом на колёсах', 'Велобагажник на фаркоп', 'Другое'],
      },
      { code: 'email', label: 'E-mail для подборки', type: 'email', placeholder: 'mail@example.ru', isRequired: true },
      { code: 'need_install', label: 'Нужна установка в сервисном центре', type: 'checkbox' },
    ],
  },
  {
    code: 'review',
    name: 'Отзыв',
    description: 'Расскажите, как прошла покупка или установка. Лучшие отзывы публикуем на сайте.',
    notifyEmail: 'otzyvy@farkop.ru',
    successMessage: 'Спасибо за отзыв! Он появится на сайте после проверки модератором.',
    submitLabel: 'Оставить отзыв',
    isActive: true,
    fields: [
      { code: 'name', label: 'Ваше имя', type: 'text', placeholder: 'Алексей из Подольска', isRequired: true },
      { code: 'order_number', label: 'Номер заказа', type: 'text', placeholder: 'Например, ФР-104582' },
      {
        code: 'rating',
        label: 'Оценка',
        type: 'select',
        options: ['5 — отлично', '4 — хорошо', '3 — нормально', '2 — плохо', '1 — ужасно'],
        isRequired: true,
      },
      {
        code: 'review_text',
        label: 'Отзыв',
        type: 'textarea',
        placeholder: 'Что понравилось, что можно улучшить',
        isRequired: true,
      },
      { code: 'publish_consent', label: 'Разрешаю опубликовать отзыв на сайте', type: 'checkbox' },
    ],
  },
  {
    code: 'warranty',
    name: 'Вопрос по гарантии',
    description:
      'На фаркопы действует гарантия производителя, на установку — 3 года от «Фаркоп.ру». Опишите проблему, и мы предложим решение.',
    notifyEmail: 'garantiya@farkop.ru',
    successMessage:
      'Обращение зарегистрировано. Инженер гарантийного отдела ответит на почту в течение двух рабочих дней.',
    submitLabel: 'Отправить обращение',
    isActive: true,
    fields: [
      { code: 'name', label: 'ФИО', type: 'text', placeholder: 'Петров Сергей Николаевич', isRequired: true },
      { code: 'email', label: 'E-mail', type: 'email', placeholder: 'mail@example.ru', isRequired: true },
      { code: 'phone', label: 'Телефон', type: 'phone', placeholder: '+7 (900) 000-00-00' },
      { code: 'order_number', label: 'Номер заказа или заказ-наряда', type: 'text', placeholder: 'ФР-104582', isRequired: true },
      {
        code: 'issue_type',
        label: 'Что случилось',
        type: 'select',
        options: [
          'Не работает электрика / нет сигналов на розетке',
          'Люфт или скрип шара',
          'Коррозия или повреждение покрытия',
          'Ошибка на приборной панели',
          'Другое',
        ],
        isRequired: true,
      },
      {
        code: 'description',
        label: 'Описание проблемы',
        type: 'textarea',
        placeholder: 'Когда появилась проблема, при каких условиях проявляется',
        isRequired: true,
      },
      { code: 'agree', label: 'Согласен на обработку персональных данных', type: 'checkbox', isRequired: true },
    ],
  },
  {
    code: 'wholesale',
    name: 'Оптовым клиентам',
    description:
      'Для автосервисов, дилеров и интернет-магазинов: оптовые цены, отсрочка платежа и доставка по России транспортными компаниями.',
    notifyEmail: 'opt@farkop.ru',
    successMessage: 'Спасибо за интерес! Менеджер оптового отдела пришлёт прайс-лист и условия сотрудничества.',
    submitLabel: 'Получить оптовый прайс',
    isActive: true,
    fields: [
      { code: 'company', label: 'Название компании', type: 'text', placeholder: 'ООО «Автотехцентр»', isRequired: true },
      { code: 'inn', label: 'ИНН', type: 'text', placeholder: '7701234567', isRequired: true },
      { code: 'contact_person', label: 'Контактное лицо', type: 'text', placeholder: 'Имя и должность', isRequired: true },
      { code: 'email', label: 'E-mail', type: 'email', placeholder: 'opt@company.ru', isRequired: true },
      { code: 'phone', label: 'Телефон', type: 'phone', placeholder: '+7 (900) 000-00-00', isRequired: true },
      {
        code: 'business_type',
        label: 'Вид деятельности',
        type: 'select',
        options: ['Автосервис / СТО', 'Официальный дилер', 'Интернет-магазин', 'Магазин автозапчастей', 'Другое'],
      },
      {
        code: 'monthly_volume',
        label: 'Планируемый объём в месяц',
        type: 'select',
        options: ['До 10 фаркопов', '10–50 фаркопов', '50–200 фаркопов', 'Более 200 фаркопов'],
      },
      { code: 'comment', label: 'Комментарий', type: 'textarea', placeholder: 'Регион, интересующие бренды, условия доставки' },
    ],
  },
  {
    code: 'trade-in-old-towbar',
    name: 'Сдать старый фаркоп в зачёт',
    description: 'Акция завершена: принимали старый фаркоп в зачёт нового со скидкой до 3 000 ₽.',
    notifyEmail: 'zakaz@farkop.ru',
    successMessage: 'Заявка принята. Менеджер оценит фаркоп по фото и назовёт размер скидки.',
    submitLabel: 'Оценить фаркоп',
    isActive: false,
    fields: [
      { code: 'name', label: 'Имя', type: 'text', placeholder: 'Имя', isRequired: true },
      { code: 'phone', label: 'Телефон', type: 'phone', placeholder: '+7 (900) 000-00-00', isRequired: true },
      { code: 'old_towbar', label: 'Производитель и модель старого фаркопа', type: 'text', placeholder: 'Bosal 3054-A' },
      {
        code: 'condition',
        label: 'Состояние',
        type: 'select',
        options: ['Как новый', 'Есть следы ржавчины', 'Требует ремонта'],
      },
    ],
  },
];

/** Добавить в форму недостающие поля по коду; возвращает, сколько создано. */
async function ensureFields(form, fields) {
  let created = 0;
  const existing = [...(form.fields ?? [])];
  for (const field of fields) {
    const result = await ensure(
      existing,
      (item) => item.code === field.code,
      () => post(`/forms/${form.id}/fields`, { isActive: true, isRequired: false, ...field }),
    );
    if (result.created) {
      existing.push(result.item);
      created += 1;
    }
  }
  return created;
}

export default async function seed() {
  let createdForms = 0;
  let createdFields = 0;

  const forms = await get('/forms');

  // Пользовательская форма: только поля, и только если их нет (или есть лишь наши).
  const feedback = forms.find((form) => form.code === 'feedback');
  if (feedback) {
    const ourCodes = new Set(FEEDBACK_FIELDS.map((field) => field.code));
    const onlyOurs = (feedback.fields ?? []).every((field) => ourCodes.has(field.code));
    if (onlyOurs) {
      const n = await ensureFields(feedback, FEEDBACK_FIELDS);
      createdFields += n;
      log(SECTION, `feedback: полей добавлено ${n}`);
    } else {
      log(SECTION, 'feedback: у формы уже свои поля — не трогаем');
    }
  } else {
    log(SECTION, 'feedback: формы нет — пропускаем (её заводит пользователь)');
  }

  for (const { fields, ...data } of FORMS) {
    const { item: form, created } = await ensure(
      forms,
      (item) => item.code === data.code,
      () => post('/forms', data),
    );
    if (created) {
      forms.push(form);
      createdForms += 1;
    }
    const n = await ensureFields(form, fields);
    createdFields += n;
    log(SECTION, `${data.code}: ${created ? 'создана' : 'уже есть'}, полей добавлено ${n}`);
  }

  const total = createdForms + createdFields;
  log(SECTION, `итого создано: форм ${createdForms}, полей ${createdFields} (всего ${total})`);
  return { created: total, createdForms, createdFields };
}
