import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import { loadContentBlockUsagesThunk } from '../../redux/action-creaters/content';
import type { EditorLink } from '../editorForm';
import { toUsageLinks } from './htmlBlockLinks';

export interface ContentBlockUsages {
  /** Ссылки на места подключения; undefined — ещё загружаются */
  links: EditorLink[] | undefined;
  /** Список получить не удалось — «нигде не подключён» тогда было бы неправдой */
  failed: boolean;
}

/**
 * Где подключён открытый в шторке блок. Читается при каждом открытии блока:
 * подключают его в других разделах, и список мог поменяться, пока шторка
 * была закрыта.
 */
export const useContentBlockUsages = (selectedId: string | null): ContentBlockUsages => {
  const dispatch = useDispatch<AppDispatch>();
  const [state, setState] = useState<ContentBlockUsages>({ links: undefined, failed: false });

  useEffect(() => {
    const id = Number(selectedId);
    // Новый блок ещё нигде не подключён: идентификатора у него нет
    if (!selectedId || !Number.isInteger(id)) {
      setState({ links: [], failed: false });
      return;
    }

    // Ответ на уже закрытый блок не должен подменить список открытого
    let actual = true;
    setState({ links: undefined, failed: false });

    dispatch(loadContentBlockUsagesThunk(id))
      .then((usages) => actual && setState({ links: toUsageLinks(usages), failed: false }))
      .catch(() => actual && setState({ links: [], failed: true }));

    return () => {
      actual = false;
    };
  }, [dispatch, selectedId]);

  return state;
};
