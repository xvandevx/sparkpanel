import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadBrandThunk } from '../../redux/action-creaters/settings';

/**
 * Чем подписана панель: свой логотип из настроек или SparkPanel (`logoUrl`
 * пусто). Нужен и до входа — левое меню и экран входа, — поэтому читается
 * публичным маршрутом, один раз за сеанс; после сохранения настроек его
 * перечитывает `useSettingsActions`.
 */
export function useBrand() {
  const dispatch = useDispatch<AppDispatch>();
  const brand = useSelector((state: RootState) => state.settings.brand);

  useEffect(() => {
    if (!brand) dispatch(loadBrandThunk());
  }, [brand, dispatch]);

  return {
    logoUrl: brand?.logoUrl ?? '',
    siteName: brand?.siteName ?? '',
    /** Пришло ли: до этого логотип не рисуют, чтобы SparkPanel не мелькнул перед своим */
    isLoaded: brand !== null,
  };
}
