import { Breadcrumb } from 'antd';

/** Одна ступень пути: без обработчика — текущая страница, с ним — переход наверх. */
export interface Crumb {
  title: string;
  onClick?: () => void;
}

/**
 * Путь до открытого уровня: по нему видно, где ты, и по нему же поднимаются
 * наверх. Отдельной кнопки «Назад» нет — ступени кликабельны, а слева есть
 * то же дерево в меню, так что кнопка только занимала бы место.
 *
 * Цвет ступеней — собственный у antd (`linkColor` крошек), поэтому здесь
 * только разметка.
 */
export default function LevelCrumbs({ items }: { items: Crumb[] }) {
  return (
    <Breadcrumb
      items={items.map((item) => ({
        title: item.onClick ? <a onClick={item.onClick}>{item.title}</a> : item.title,
      }))}
    />
  );
}
