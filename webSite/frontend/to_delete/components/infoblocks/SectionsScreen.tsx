import { ContentEditor } from '../contentEditor';
import {
  useSectionsController,
  useLoadInfoblocksStructure,
} from '../../logic/infoblocks';

/**
 * Первый экран раздела (`/admin/infoblocks`): типы инфоблоков плоским
 * списком. Сами инфоблоки живут на странице своего типа — туда ведёт
 * кнопка перехода в строке.
 *
 * Своей заглушки на загрузку и ошибку здесь нет: и то, и другое редактор
 * контента показывает сам — список пуст, ошибка над таблицей.
 */
export default function SectionsScreen() {
  // Структура нужна и подменю слева, поэтому грузится один раз на сессию
  useLoadInfoblocksStructure();

  const { list, form, actions, history, settings } = useSectionsController();

  return (
    <ContentEditor
      list={list}
      form={form}
      actions={actions}
      history={history}
      settings={settings}
    />
  );
}
