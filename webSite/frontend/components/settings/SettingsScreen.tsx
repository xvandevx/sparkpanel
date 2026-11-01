import { useEffect, useState } from 'react';
import { Alert, App, Button, Space, Spin, Tabs } from 'antd';
import {
  changesOf,
  draftOf,
  useSettings,
  useSettingsActions,
  type SettingsDraft,
} from '../../logic/settings';
import { PageTitle } from '../ui';
import SiteFields from './SiteFields';

/**
 * Настройки сайта: вкладка «Общие» — название и хранилище для новых файлов.
 * Черновик живёт здесь, пока экран открыт; сохранение одно — уходит только
 * изменённое. Внешние хранилища и домены —
 * списки со своими карточками, у каждого свой подпункт меню (`StoragesScreen`,
 * `DomainsScreen`).
 */
export default function SettingsScreen() {
  const { message } = App.useApp();
  const { settings, error } = useSettings();
  const { save } = useSettingsActions();
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Пришли настройки — набранное сбрасывается к сохранённому: и при открытии,
  // и после сохранения
  useEffect(() => {
    if (settings) setDraft(draftOf(settings));
  }, [settings]);

  if (error && !settings) return <Alert type="error" showIcon message={error} />;
  if (!settings || !draft) return <Spin />;

  const changes = changesOf(draft, settings);
  const isChanged = Object.keys(changes).length > 0;

  const change = (patch: Partial<SettingsDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const submit = async () => {
    setIsSaving(true);
    const failure = await save(changes);
    setIsSaving(false);
    if (failure) message.error(failure);
    else message.success('Настройки сохранены');
  };

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Настройки сайта</PageTitle>
      <Tabs
        items={[
          { key: 'general', label: 'Общие', children: <SiteFields draft={draft} onChange={change} /> },
        ]}
        tabBarExtraContent={
          <Space>
            <Button disabled={!isChanged || isSaving} onClick={() => setDraft(draftOf(settings))}>
              Отменить
            </Button>
            <Button type="primary" loading={isSaving} disabled={!isChanged} onClick={submit}>
              Сохранить
            </Button>
          </Space>
        }
      />
    </div>
  );
}
