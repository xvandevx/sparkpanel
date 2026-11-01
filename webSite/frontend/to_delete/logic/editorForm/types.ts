/**
 * Контракт формы, описанной данными: набор полей и групп, значения и правила
 * видимости. Общий для всех экранов — и для шторки редактора контента
 * (`logic/contentEditor/`), и для отдельных форм вроде раздела «Настройки».
 *
 * Разметку эти описания не содержат: рисует их `components/editorForm/`.
 */

/** Значения формы. Ключ может быть составным: `meta.title` — это просто строка с точкой. */
export type EditorValues = Record<string, unknown>;

export const EditorFieldType = {
  /** Однострочный ввод */
  Text: 'text',
  /** Многострочный ввод */
  Textarea: 'textarea',
  Number: 'number',
  /** Переключатель да/нет */
  Switch: 'switch',
  Select: 'select',
  /** Список строк, которые вводят по одной: значение — массив (поддомены) */
  Tags: 'tags',
  /** Пароль: ввод скрыт точками, значение наружу не возвращается и не показывается */
  Password: 'password',
  /**
   * Выбор файлов с диска: значение — массив `File`, их отдаёт браузер.
   * Нужен там, где запись заводится самим файлом (медиатека): без него
   * «добавить» в шторке нечем было бы заполнить.
   */
  File: 'file',
  /**
   * HTML-разметка: моноширинный многострочный ввод. С `htmlBlocks` в разметку
   * можно подключать переиспользуемые HTML-блоки — так поле контента одинаково
   * работает в любом разделе, где оно есть.
   */
  Html: 'html',
  /** Список ссылок только для чтения: значения нет, ссылки приходят в `links` */
  Links: 'links',
  /**
   * Файл медиатеки: значение — номер файла (или массив номеров при `multiple`).
   * Файл выбирают из уже загруженных или загружают тут же — он ляжет в медиатеку.
   */
  Media: 'media',
  /**
   * Визуальный редактор разметки (Quill): значение — HTML. С `htmlBlocks` под ним
   * есть вставка HTML-блока маркером `#BLOCK:код#` в позицию курсора.
   */
  RichText: 'richtext',
  /** Таблица фиксированного размера (`table`): значение — строки ячеек, `string[][]` */
  Table: 'table',
  /** Значение только для чтения (идентификатор, даты) */
  ReadOnly: 'readonly',
} as const;

export type EditorFieldType = (typeof EditorFieldType)[keyof typeof EditorFieldType];

export interface EditorSelectOption {
  label: string;
  value: string;
  /** Пояснение под пунктом списка */
  description?: string;
  /** Группа в выпадающем списке: «Страницы», «Инфоблок «Новости»» */
  group?: string;
}

/**
 * Ограничения поля `Media`: какие файлы медиатеки подходят. Формат и вес
 * проверяются и по карточке файла, разрешение — загрузив картинку.
 */
export interface EditorMediaRules {
  /** Только изображения */
  imagesOnly: boolean;
  /** Расширения без точки; пусто — любые */
  formats: string[];
  /** Наибольший вес, МБ; null — без ограничения */
  maxSizeMb: number | null;
  /** Наибольшее разрешение изображения, px; null — без ограничения */
  maxWidth: number | null;
  maxHeight: number | null;
}

/** Переменная шаблона: `#NAME#` подставляется значением конкретного элемента. */
export interface EditorVariable {
  /** Имя без решёток: NAME, CODE, … */
  name: string;
  label: string;
  /** Значение для предпросмотра подстановки */
  sample: string;
}

/** HTML-блок, который можно подключить в поле `Html`. */
export interface EditorHtmlBlock {
  /** Код блока: по нему он пишется в разметке маркером `#BLOCK:код#` */
  code: string;
  name: string;
  /** Выключенный блок на сайт не выводится — поле об этом предупреждает */
  isActive: boolean;
  /** Где открыть блок в админке */
  href: string;
}

/** Ссылка в поле `Links`. */
export interface EditorLink {
  key: string;
  label: string;
  href: string;
  /** Пояснение мелким шрифтом рядом со ссылкой */
  note?: string;
}

export interface EditorFieldDef {
  key: string;
  label: string;
  type: EditorFieldType;
  required?: boolean;
  placeholder?: string;
  /** Подсказка под полем */
  note?: string;
  /** Для Textarea: высота в строках */
  rows?: number;
  /**
   * Несколько значений; значение поля — массив. Select — выбор нескольких
   * вариантов, Media — несколько файлов медиатеки, File — несколько файлов
   * с диска, у остальных типов — список полей со строками «добавить» и «убрать».
   */
  multiple?: boolean;
  /**
   * Поле можно оставить пустым — значение null. Number: пусто вместо 0
   * («не указано» и «ноль» — разные вещи); Select: выбор сбрасывается крестиком.
   * Так ведут себя свойства записей.
   */
  nullable?: boolean;
  /** Для Number: нижняя граница; не задана — 0 (порядок, счётчики) */
  min?: number;
  /**
   * Значение у новой записи. Не задано — пустое значение типа поля: '' у текста,
   * 0 у числа, «включено» у выключателя. Порядок редактор считает сам — за
   * последней записью списка.
   */
  defaultValue?: unknown;
  /** Для Media: какие файлы подходят; не задано — любые */
  media?: EditorMediaRules;
  /** Для Table: столбцы и их заголовки; строки добавляются в карточке записи */
  table?: { columns: number; headers: string[] };
  /** Для Select: список значений, возможно зависящий от остальных полей формы */
  options?: EditorSelectOption[] | ((values: EditorValues) => EditorSelectOption[]);
  /** Поле не показывается при текущих значениях формы (например, шаблон у статичной страницы) */
  hidden?: (values: EditorValues) => boolean;
  /** Поле видно, но менять его нельзя (код главной страницы) */
  disabled?: (values: EditorValues) => boolean;
  /**
   * Поле — шаблон: в нём допустимы переменные, редактор покажет их список,
   * предпросмотр подстановки и предупредит о незнакомых.
   */
  variables?: EditorVariable[];
  /**
   * Для Html: блоки, которые можно подключить в разметку. Не задан — поле
   * остаётся просто разметкой (у самого HTML-блока: блок в блок не вкладывается).
   */
  htmlBlocks?: EditorHtmlBlock[];
  /** Для Links: ссылки; не задан — список ещё загружается */
  links?: EditorLink[];
  /**
   * Проверка значения перед сохранением: текст ошибки или null.
   * Чистая функция — форма её только вызывает, сама правил не пишет.
   */
  validate?: (value: unknown, values: EditorValues) => string | null;
  /** Каскад: правка поля меняет и другие значения формы */
  onChange?: (value: unknown, values: EditorValues) => EditorValues;
}

/** Группа полей: заголовок + пояснение. */
export interface EditorFieldGroup {
  key: string;
  title?: string;
  description?: string;
  /** Ключи полей из общего списка полей формы */
  fields: string[];
  /** Группа целиком скрыта при текущих значениях */
  hidden?: (values: EditorValues) => boolean;
}

/** Что нужно компонентам формы, чтобы её нарисовать. */
export interface EditorFormValue {
  fields: EditorFieldDef[];
  /** Группы, видимые при текущих значениях, в порядке показа */
  groups: EditorFieldGroup[];
  values: EditorValues;
  setFieldValue: (key: string, value: unknown) => void;
}
