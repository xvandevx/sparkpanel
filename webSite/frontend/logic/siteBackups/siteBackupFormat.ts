import type { SiteBackup } from '../../redux/action-creaters/siteBackups';
import { sizeText } from '../backupLabels';
import { formatDateTime } from '../dateFormat';

/** Слово, которым подтверждают восстановление сайта: случайно его не наберёшь. */
export const CONFIRM_WORD = 'ВОССТАНОВИТЬ';

export const isConfirmWord = (typed: string): boolean => typed.trim().toUpperCase() === CONFIRM_WORD;

/** Имя скачанного файла — как его называет и сервер: дата копии и номер. */
export const siteBackupFileName = (backup: SiteBackup): string =>
  `sparkpanel-site-${backup.createdAt.slice(0, 10)}-${backup.id}.json.gz`;

/** Сколько копий и сколько они весят вместе — в шапке таблицы копий. */
export const backupsTotalText = (backups: SiteBackup[]): string =>
  `${backups.length} · ${sizeText(backups.reduce((sum, backup) => sum + backup.size, 0))}`;

/** Строка о копии в окне восстановления: когда, кем и сколько весит. */
export const siteBackupSummary = (backup: SiteBackup, kindLabel: string): string =>
  [formatDateTime(backup.createdAt), kindLabel, backup.note, backup.authorEmail, sizeText(backup.size)]
    .filter(Boolean)
    .join(' · ');
