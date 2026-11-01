import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  createApiKeyThunk,
  loadApiKeysThunk,
  loadApiListsThunk,
  removeApiKeyThunk,
  type ApiKey,
  type ApiList,
  type NewApiKey,
} from '../../redux/action-creaters/externalApi';

/**
 * Ключи внешнего API глазами вкладки «Доступ»: список, создать, отозвать —
 * и списки API, из которых выбирают, куда ключ может писать. Читаются при
 * открытии и после каждой своей правки. Действия бросают ошибку текстом —
 * сообщение показывает тот, кто нажимал.
 */
export function useApiKeys() {
  const dispatch = useDispatch<AppDispatch>();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [lists, setLists] = useState<ApiList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedKeys, loadedLists] = await Promise.all([dispatch(loadApiKeysThunk()), dispatch(loadApiListsThunk())]);
      setKeys(loadedKeys);
      setLists(loadedLists);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить ключи');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Создать ключ; ответ — ключ целиком, больше его не покажут. */
  const create = async (key: NewApiKey): Promise<string> => {
    const { secret } = await dispatch(createApiKeyThunk(key));
    await reload();
    return secret;
  };

  const revoke = async (key: ApiKey): Promise<void> => {
    await dispatch(removeApiKeyThunk(key.id));
    await reload();
  };

  return { keys, lists, isLoading, error, create, revoke };
}
