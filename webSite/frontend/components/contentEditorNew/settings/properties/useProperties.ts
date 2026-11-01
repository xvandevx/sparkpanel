import { useState } from 'react';
import { App } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../redux';
import {
  createEditorPropertyThunk,
  removeEditorPropertyThunk,
  updateEditorPropertyThunk,
} from '../../../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../../../redux/reducers/contentEditorNewReducer';
import { nextPosition, payloadOf, type PropertyDraft } from './property';

/**
 * Свойства списка и что с ними делают: сохранить одно, удалить одно.
 *
 * Действия берут отсюда и таблица, и шторка — друг другу они их не передают.
 * Пока свойства сохранялись списком целиком, иначе и не выходило: владеть
 * массивом мог только тот, кто его рисует, и шторка отдавала ему черновик
 * наверх. Теперь запись уходит по своему номеру, и посредник не нужен:
 * кто правит свойство, тот его и сохраняет.
 */
export function useProperties(listKey: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const { properties, tabs } =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;

  // Флаг свой у каждого, кто сохраняет: таблица показывает им загрузку строк,
  // шторка — ожидание на кнопке
  const [isSaving, setIsSaving] = useState(false);

  /** Сохранение уходит одной записью: соседей оно не трогает. */
  const save = async (property: PropertyDraft): Promise<boolean> => {
    setIsSaving(true);
    const error = await dispatch(
      property.id === null
        ? createEditorPropertyThunk(listKey, payloadOf(property))
        : updateEditorPropertyThunk(listKey, property.id, payloadOf(property)),
    );
    setIsSaving(false);

    if (error) {
      message.error(error);
      return false;
    }
    message.success(property.id === null ? 'Свойство добавлено' : 'Свойство сохранено');
    return true;
  };

  /**
   * Перенос на другую вкладку карточки — та же правка свойства, только без
   * шторки: меняется вкладка, и свойство встаёт последним среди новых соседей.
   */
  const move = async (property: PropertyDraft, tab: string, tabName: string) => {
    if (property.id === null) return;
    setIsSaving(true);
    const error = await dispatch(
      updateEditorPropertyThunk(
        listKey,
        property.id,
        payloadOf({
          ...property,
          tab,
          position: nextPosition(properties as unknown as PropertyDraft[], tab),
        }),
      ),
    );
    setIsSaving(false);

    if (error) message.error(error);
    else message.success(`Свойство перенесено на вкладку «${tabName}»`);
  };

  /**
   * Удаление спрашивают: вместе со свойством у всех записей списка пропадут
   * его значения. Ответ ждём — по нему закрывают шторку.
   */
  const remove = (property: PropertyDraft): Promise<boolean> =>
    new Promise((resolve) => {
      modal.confirm({
        title: `Удалить свойство «${String(property.name).trim() || property.code}»?`,
        content: 'Значения этого свойства у всех записей сотрутся.',
        okText: 'Удалить',
        cancelText: 'Отмена',
        onCancel: () => resolve(false),
        onOk: async () => {
          if (property.id === null) {
            resolve(false);
            return;
          }
          setIsSaving(true);
          const error = await dispatch(removeEditorPropertyThunk(listKey, property.id));
          setIsSaving(false);

          if (error) {
            message.error(error);
            resolve(false);
            return;
          }
          message.success('Свойство удалено');
          resolve(true);
        },
      });
    });

  return {
    properties: properties as unknown as PropertyDraft[],
    tabs,
    isSaving,
    save,
    move,
    remove,
  };
}
