import { ContentEditor } from '../contentEditor';
import { useDomainsController, useLoadDomains } from '../../logic/domains';

/**
 * Домены сайта: тот же редактор контента, что и в разделах со списками —
 * таблица, шторка редактирования и журнал изменений. Основной домен лежит
 * первой строкой, остальные записи это поддомены и дополнительные имена.
 */
export default function DomainsPanel() {
  // Загружаем список один раз на раздел, а не в каждом компоненте
  useLoadDomains();

  const { list, form, actions, history, settings } = useDomainsController();

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
