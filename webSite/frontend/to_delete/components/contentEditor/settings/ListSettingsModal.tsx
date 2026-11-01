import type { EditorListSettings } from '../../../logic/contentEditor';
import { ListSettingsFormProvider } from '../../../logic/listSettings';
import SettingsDialog from './SettingsDialog';

/** Окно настроек списка: имя, код и свойства записей настраиваемого списка. */
export default function ListSettingsModal({
  settings,
  open,
  onClose,
}: {
  /** Какой список настраиваем */
  settings: EditorListSettings;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ListSettingsFormProvider target={settings} open={open}>
      <SettingsDialog open={open} onClose={onClose} />
    </ListSettingsFormProvider>
  );
}
