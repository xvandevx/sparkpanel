import {
  ContentEditor,
  FieldType,
  standardColumns,
  standardFields,
  type BlockedSettings,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { domainsApi } from '../../logic/settings';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * «Домены» — подпункт «Настроек»: домены сайта деревом на редакторе контента —
 * в корне домены, под каждым его поддомены. Раздел отдаёт редактору Api
 * и описание полей, остальное редактор делает сам.
 *
 * Поддомен — запись с родителем, и хранит она то, что набрали: `ekb`, а не
 * `ekb.farkop.ru`. Полный адрес складывает сервер и отдаёт полем `address` —
 * его показывает своя колонка.
 */
const DOMAIN_FIELDS: EditorFields = {
  name: {
    name: 'Домен',
    isRequired: true,
    note: 'У домена — имя целиком: farkop.ru. У поддомена — только его часть: ekb, адрес ekb.farkop.ru сложится сам',
  },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенный домен остаётся в списке, но сайт на нём не работает',
  },
  sort: standardFields.sort,
};

const DOMAIN_COLUMNS: EditorColumns = {
  name: { name: 'Домен', size: 240, isSort: true, isSearch: true },
  address: { name: 'Адрес', size: 240, isSearch: true },
  isActive: standardColumns.isActive,
  sort: standardColumns.sort,
};

/** Журнала у доменов нет, как и у остальных настроек сайта. */
const DOMAIN_VIEW: EditorSettings = {
  addLabel: 'Добавить домен',
  isHistoryHidden: true,
};

/**
 * Домен и поддомены под ним — ровно два уровня. Код записи не нужен: запись
 * и так называется именем хоста, по нему сайт её и найдёт.
 */
const DOMAIN_BLOCKED: BlockedSettings = {
  maxDepth: 2,
  codeMode: CodeMode.None,
  isHistoryEnabled: false,
  // Домен — устройство сайта, а не его контент: публиковать нечего
  isDraftEnabled: false,
};

export default function DomainsScreen() {
  return (
    <ContentEditor
      listKey={ListKey.domains}
      api={domainsApi}
      blockedSettings={DOMAIN_BLOCKED}
      settings={DOMAIN_VIEW}
      fields={DOMAIN_FIELDS}
      columns={DOMAIN_COLUMNS}
    />
  );
}
