import { useState } from 'react';
import { Button, Checkbox, Dropdown, type MenuProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TableColumn } from '../table/columns';

/**
 * Кнопка «Добавить условие» в конце строки фильтра: меню всех полей, по которым
 * можно фильтровать, — сначала колонки раздела, за чертой свойства записей.
 * Галочка — поле стоит в фильтре; клик ставит его чипом или убирает. Набор полей
 * общий: поставленное поле появится в фильтре у всех.
 *
 * Меню не закрывается от клика по полю: обычно в фильтр ставят несколько
 * полей подряд. Закрывают его кнопкой или кликом мимо.
 */
export default function FilterButton({
  fields,
  keys,
  onToggle,
}: {
  /** Поля, которые можно поставить в фильтр */
  fields: TableColumn[];
  /** Ключи полей, стоящих в фильтре */
  keys: string[];
  /** Клик по полю: поставить его в фильтр или убрать */
  onToggle: (key: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const added = new Set(keys);

  const item = (key: string, name: string) => ({
    key,
    // Галочка только показывает, стоит ли поле в фильтре: щёлкает строка меню.
    // Своих кликов у неё нет — иначе клик по ней переключал бы поле дважды
    label: (
      <span className="flex items-center gap-2">
        <Checkbox checked={added.has(key)} style={{ pointerEvents: 'none' }} />
        {name}
      </span>
    ),
  });

  const columnItems = fields.filter((field) => field.column).map((field) => item(field.key, field.name));
  const propertyItems = fields.filter((field) => field.property).map((field) => item(field.key, field.name));

  const items: MenuProps['items'] = [
    ...columnItems,
    ...(columnItems.length > 0 && propertyItems.length > 0 ? [{ type: 'divider' as const }] : []),
    ...propertyItems,
  ];

  return (
    <Dropdown
      trigger={['click']}
      open={isOpen}
      // Закрывает только кнопка или клик мимо меню, а не выбор поля
      onOpenChange={(nextOpen, info) => {
        if (info.source === 'trigger') setIsOpen(nextOpen);
      }}
      menu={{ items, onClick: ({ key }) => onToggle(key) }}
    >
      <Button type="link" icon={<PlusOutlined />}>
        Добавить условие
      </Button>
    </Dropdown>
  );
}
