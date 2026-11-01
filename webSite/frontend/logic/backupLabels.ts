/**
 * Подписи резервных копий — общие у копий списка и копий сайта: виды копий
 * одни и те же, размер пишется одинаково.
 */

export type BackupKindKey = 'manual' | 'before-restore' | 'upload';

/** Метка вида копии: подпись и цвет `Tag` из набора antd. */
export const BACKUP_KINDS: Record<BackupKindKey, { label: string; color: string }> = {
  manual: { label: 'вручную', color: 'blue' },
  'before-restore': { label: 'перед восстановлением', color: 'orange' },
  upload: { label: 'из файла', color: 'default' },
};

/** Размер копии: КБ до мегабайта, дальше МБ. */
export const sizeText = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} КБ`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
