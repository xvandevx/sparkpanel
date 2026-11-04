import { createElement, useMemo, useState } from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigation, type NavItem } from '../../../logic/navigation';
import { useBrand } from '../../../logic/settings';
import { BrandMark } from '../../ui';
import SidebarUser from './SidebarUser';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

/** Левое меню: логотип, разделы системы и учётная запись внизу. */
export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const { items, activeKey, openKeys, navigate } = useNavigation();
  const { logoUrl, siteName, isLoaded } = useBrand();

  /** Подменю, раскрытые руками. То, внутри которого мы находимся, открыто всегда. */
  const [manualOpen, setManualOpen] = useState<string[]>([]);
  const open = useMemo(
    () => Array.from(new Set([...openKeys, ...manualOpen])),
    [manualOpen, openKeys],
  );

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={232}
      breakpoint="lg"
      // Место под кнопку сворачивания antd резервирует сам: на Sider с триггером
      // он вешает padding-bottom в её высоту. Свой такой же отступ добавлять не нужно —
      // получится пустая полоса между учётной записью и кнопкой.
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Высота знака держится и до ответа: меню не прыгает, когда логотип придёт */}
        <div style={{ padding: collapsed ? '18px 12px' : '18px 20px', minHeight: 72 }}>
          {isLoaded && <BrandMark withWordmark={!collapsed} logoUrl={logoUrl} logoAlt={siteName} />}
        </div>

        <Menu
          // Layout.Sider по умолчанию тёмный — меню в нём тоже тёмное
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          // Раскрыт тот раздел, внутри которого мы находимся, плюс открытые руками.
          // defaultOpenKeys не подошёл: подпункты приходят из запроса, то есть
          // уже после первого рендера, и раскрывать было бы нечего
          openKeys={open}
          onOpenChange={(keys) => setManualOpen(keys as string[])}
          onClick={({ key }) => navigate(key)}
          // Длинный список разделов прокручивается, не выдавливая учётную запись
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          items={items.map((item) => toMenuItem(item, navigate))}
        />

        <SidebarUser collapsed={collapsed} />
      </div>
    </Sider>
  );
}

/**
 * Пункт меню antd из пункта навигации. Рекурсивно: подменю бывает вложенным —
 * «Инфоблоки» разворачиваются в типы, тип в свои списки.
 *
 * У пункта с подменю antd не зовёт `onClick` — клик по строке только
 * раскрывает её. Поэтому по самому названию переходим сами: иначе до страницы
 * такого пункта (все типы, все инфоблоки типа) было бы не добраться.
 *
 * Название — `span`, а не ссылка: ссылку antd красит цветом ссылок, и пункт
 * с подменю выделялся бы синим среди обычных. Клик по строке меню и так
 * показан курсором, своего цвета здесь не заводим.
 */
function toMenuItem(
  item: NavItem,
  navigate: (key: string) => void,
): NonNullable<MenuProps['items']>[number] {
  const hasChildren = Boolean(item.children?.length);

  return {
    key: item.key,
    icon: item.icon ? createElement(item.icon) : undefined,
    // У группы своей страницы нет — её название только раскрывает подменю
    label: hasChildren && !item.isGroup ? (
      <span
        onClick={(event) => {
          event.stopPropagation();
          navigate(item.key);
        }}
      >
        {item.label}
      </span>
    ) : (
      item.label
    ),
    children: hasChildren
      ? item.children?.map((child) => toMenuItem(child, navigate))
      : undefined,
  };
}
