import { Alert, App, Button, Card, Skeleton, Space } from 'antd';
import { EditorForm } from '../editorForm';
import { EditorFormProvider } from '../../logic/editorForm';
import { useLoadSettings, useSettings } from '../../logic/settings';

/**
 * Параметры сайта одной формой. Поля рисуют общие компоненты формы — те же,
 * что в шторке редактора контента, поэтому выглядит она так же, как
 * редактирование записи, только без таблицы и вкладок.
 */
export default function SiteForm() {
  // Загружаем настройки один раз на раздел — здесь, а не на странице:
  // до этого места доходит только авторизованный (см. AdminLayout).
  useLoadSettings();

  const { message } = App.useApp();
  const { form, isReady, isChanged, isSaving, error, reset, submit } = useSettings();

  const handleSave = async () => {
    const { status, message: text } = await submit();
    if (status === 'error') message.error(text ?? 'Не удалось сохранить настройки');
    else if (status === 'saved') message.success('Изменения сохранены');
    else message.info('Изменений нет');
  };

  if (!isReady) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  return (
    <Card
      title="Настройки сайта"
      extra={
        <Space>
          <Button onClick={reset} disabled={!isChanged}>
            Отменить
          </Button>
          <Button type="primary" loading={isSaving} disabled={!isChanged} onClick={handleSave}>
            Сохранить
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ display: 'flex' }}>
        {isChanged && (
          <Alert type="warning" showIcon message="Данные изменены — не забудьте сохранить" />
        )}
        {error && <Alert type="error" showIcon message={error} />}

        <EditorFormProvider value={form}>
          <EditorForm />
        </EditorFormProvider>
      </Space>
    </Card>
  );
}
