import { sizeText } from '../../../logic/backupLabels';
import { formatDateTime } from '../../../logic/dateFormat';
import { plural } from '../../../logic/plural';
import type {
  EditorBackup,
  EditorBackupCheck,
} from '../../../redux/action-creaters/contentEditorNew';

export { BACKUP_KINDS, sizeText } from '../../../logic/backupLabels';

const recordsText = (count: number): string => plural(count, 'запись', 'записи', 'записей');

const propertiesText = (count: number): string => plural(count, 'свойство', 'свойства', 'свойств');

/** Вторая строка копии в списке: подпись, сколько в ней и кто снял. */
export const backupDescription = (backup: EditorBackup): string =>
  [
    backup.note,
    recordsText(backup.recordsCount),
    propertiesText(backup.propertiesCount),
    sizeText(backup.size),
    backup.authorEmail,
  ]
    .filter(Boolean)
    .join(' · ');

export const backupTitle = (backup: EditorBackup): string => formatDateTime(backup.createdAt);

/** Имя файла копии: код списка и дата копии — файлы разных дней не путаются. */
export function backupFileName(code: string, backup: EditorBackup): string {
  const date = new Date(backup.createdAt);
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  return `${code}-backup-${day}-${backup.id}.json`;
}

/**
 * Предупреждения окна восстановления: что пропадёт или останется не так,
 * как было в копии. Зависят от выбранного — удаление записей грозит только
 * при замене, удаление свойств — только когда возвращают настройки.
 */
export function restoreWarnings(
  check: EditorBackupCheck,
  choice: { isReplace: boolean; isRecords: boolean; isSettings: boolean },
): string[] {
  const warnings: string[] = [];
  // Число — после двоеточия: так фраза не зависит от падежа
  if (choice.isRecords && choice.isReplace && check.removedRecords > 0) {
    warnings.push(`Удалятся записи, которых нет в копии: ${check.removedRecords}.`);
  }
  if (choice.isRecords && choice.isReplace && check.keptRecords > 0) {
    warnings.push(
      `Останутся записи, которых нет в копии, — они защищены от удаления: ${check.keptRecords}.`,
    );
  }
  if (choice.isSettings && choice.isReplace && check.removedProperties.length > 0) {
    const names = check.removedProperties.map((name) => `«${name}»`).join(', ');
    warnings.push(
      check.removedProperties.length === 1
        ? `Свойства ${names} нет в копии — оно удалится вместе со значениями.`
        : `Свойств ${names} нет в копии — они удалятся вместе со значениями.`,
    );
  }
  if (choice.isRecords && check.missingFiles > 0) {
    warnings.push(`Значения на удалённые файлы останутся пустыми: ${check.missingFiles}.`);
  }
  return warnings;
}
