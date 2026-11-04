import { useState } from 'react';
import { Button, Input, Space, Typography } from 'antd';
import { externalUrlError, type FileRules } from '../../../../logic/files';

/**
 * Ввод адреса внешнего файла: «Вставить ссылку» и «Заменить ссылку».
 * Адрес проверяется тут же — http(s) ли это и подходит ли расширение
 * под форматы свойства; Enter — принять, Esc — отменить.
 */
export default function FileUrlInput({
  initial = '',
  rules,
  submitLabel = 'Добавить',
  onSubmit,
  onCancel,
}: {
  initial?: string;
  rules: FileRules | null;
  submitLabel?: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const url = draft.trim();
    const invalid = externalUrlError(url, rules ?? NO_RULES);
    if (invalid) {
      setError(invalid);
      return;
    }
    onSubmit(url);
  };

  return (
    <Space orientation="vertical" size={4} style={{ display: 'flex' }}>
      <Space.Compact style={{ display: 'flex' }}>
        <Input
          autoFocus
          value={draft}
          placeholder="https://…"
          status={error ? 'error' : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onPressEnter={(event) => {
            // Enter в карточке не должен заодно отправить её форму
            event.preventDefault();
            submit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              onCancel();
            }
          }}
        />
        <Button type="primary" onClick={submit}>
          {submitLabel}
        </Button>
        <Button onClick={onCancel}>Отмена</Button>
      </Space.Compact>
      {error && (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          {error}
        </Typography.Text>
      )}
    </Space>
  );
}

const NO_RULES: FileRules = { isImageOnly: false, formats: [], maxSizeMb: null, maxWidth: null, maxHeight: null };
