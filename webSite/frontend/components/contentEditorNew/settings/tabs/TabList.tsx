import { useState } from 'react';
import { App, Tabs } from 'antd';
import { CloseOutlined, EditOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../redux';
import {
  createEditorTabThunk,
  removeEditorTabThunk,
  renameEditorTabThunk,
} from '../../../../redux/action-creaters/contentEditorNew';
import {
  emptyNewEditorList,
  type EditorProperty,
  type EditorTab,
} from '../../../../redux/reducers/contentEditorNewReducer';
import { ActionIcon, TabCount } from '../../ui';
import TabNameDialog from './TabNameDialog';

/**
 * Вкладки карточки записи. Правятся сразу: завели — запрос ушёл, удалили —
 * ушёл. Черновика у них нет, в отличие от свойств: у вкладки только название,
 * копить тут нечего, а свойства без кода и типа сохранять нельзя.
 *
 * Общая вкладка «Свойства» всегда первая и не удаляется: на неё попадает всё,
 * чему вкладку не назначили, и на неё же возвращаются свойства удалённой.
 */

/** Вкладка «Свойства»: у её свойств код вкладки пустой. */
export const DEFAULT_TAB = '';

export default function TabList({
  listKey,
  activeTab,
  onActiveTab,
}: {
  listKey: string;
  activeTab: string;
  onActiveTab: (code: string) => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const { tabs, properties } =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;

  // Сколько свойств на вкладке — видно, не переключаясь на неё
  const counts = countByTab(properties);

  const [isAdding, setIsAdding] = useState(false);
  /** Вкладка, которую переименовывают; null — попап закрыт */
  const [renamed, setRenamed] = useState<EditorTab | null>(null);

  const add = async (name: string) => {
    const code = await dispatch(createEditorTabThunk(listKey, name));
    if (!code) {
      message.error('Не удалось завести вкладку');
      return;
    }
    onActiveTab(code);
  };

  const rename = async (tab: EditorTab, name: string) => {
    if (!(await dispatch(renameEditorTabThunk(listKey, tab.id, name)))) {
      message.error('Не удалось переименовать вкладку');
    }
  };

  const remove = async (tab: EditorTab) => {
    if (!(await dispatch(removeEditorTabThunk(listKey, tab.id)))) {
      message.error('Не удалось удалить вкладку');
      return;
    }
    // Свойства удалённой вкладки сервер перевёл на общую «Свойства»
    if (activeTab === tab.code) onActiveTab(DEFAULT_TAB);
  };

  /**
   * Свойства удалённой вкладки не пропадают — они переходят на общую
   * «Свойства». Об этом предупреждаем: иначе кажется, что удаляешь их вместе
   * с вкладкой, а заодно и значения записей.
   */
  const confirmRemove = (tab: EditorTab) => {
    const count = counts[tab.code] ?? 0;
    if (count === 0) {
      remove(tab);
      return;
    }
    modal.confirm({
      title: `Удалить вкладку «${tab.name.trim() || tab.code}»?`,
      content: `Свойств на ней: ${count}. Они не удалятся — перейдут на общую вкладку «Свойства».`,
      okText: 'Удалить вкладку',
      cancelText: 'Отмена',
      onOk: () => remove(tab),
    });
  };

  const label = (name: string, code: string) => {
    const count = counts[code] ?? 0;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{name}</span>
        {count > 0 && <TabCount count={count} isActive={code === activeTab} />}
      </span>
    );
  };

  return (
    <>
      <Tabs
        type="editable-card"
        activeKey={activeTab}
        onChange={onActiveTab}
        // Новая вкладка заводится попапом: у неё сразу есть название.
        // Удаление — свой значок в заголовке, штатный крестик выключен
        hideAdd={false}
        onEdit={(_key, action) => {
          if (action === 'add') setIsAdding(true);
        }}
        items={[
          {
            key: DEFAULT_TAB,
            label: label('Свойства', DEFAULT_TAB),
            closable: false,
          },
          ...tabs.map((tab, index) => ({
            key: tab.code,
            // Переименование и удаление — значками рядом с названием: кода
            // пользователь не видит, вкладка живёт только в карточке записи
            label: (
              <span className="inline-flex items-center gap-1">
                {label(tab.name.trim() || `Вкладка №${index + 1}`, tab.code)}
                <ActionIcon
                  title="Переименовать вкладку"
                  icon={<EditOutlined />}
                  onClick={() => setRenamed(tab)}
                />
                <ActionIcon
                  title="Удалить вкладку"
                  icon={<CloseOutlined />}
                  isDanger
                  onClick={() => confirmRemove(tab)}
                />
              </span>
            ),
            closable: false,
          })),
        ]}
      />

      <TabNameDialog
        open={isAdding || renamed !== null}
        title={renamed ? 'Название вкладки' : 'Новая вкладка'}
        okText={renamed ? 'Сохранить' : 'Добавить'}
        name={renamed?.name ?? ''}
        onSubmit={(name) => (renamed ? rename(renamed, name) : add(name))}
        onClose={() => {
          setIsAdding(false);
          setRenamed(null);
        }}
      />
    </>
  );
}

/** Сколько свойств на каждой вкладке: код вкладки → число. */
const countByTab = (properties: EditorProperty[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const property of properties) {
    const tab = String(property.tab ?? '');
    counts[tab] = (counts[tab] ?? 0) + 1;
  }
  return counts;
};
