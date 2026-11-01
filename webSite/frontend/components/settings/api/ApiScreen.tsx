import { Result, Tabs } from 'antd';
import { useIsRoot } from '../../../logic/auth';
import { PageTitle } from '../../ui';
import ApiAccess from './ApiAccess';
import ApiDocs from './ApiDocs';

/**
 * «API» — подпункт «Настроек»: доступ сайта и приложений к данным панели.
 * «Доступ» — адрес, правила и ключи; «Документация» — спецификация, которую
 * сервер собирает из настроек списков, во встроенном Scalar. Видит экран
 * только главный администратор: ключ открывает данные сайта.
 */
export default function ApiScreen() {
  const isRoot = useIsRoot();
  if (!isRoot) {
    return (
      <Result
        status="403"
        title="Только главный администратор"
        subTitle="Ключи внешнего API и его документацию видит только главный администратор."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>API</PageTitle>
      <Tabs
        // Документация собирается при каждом показе вкладки — не раньше
        destroyOnHidden
        items={[
          { key: 'access', label: 'Доступ', children: <ApiAccess /> },
          { key: 'docs', label: 'Документация', children: <ApiDocs /> },
        ]}
      />
    </div>
  );
}
