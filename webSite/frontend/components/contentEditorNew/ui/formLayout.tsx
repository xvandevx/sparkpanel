import type { ReactNode } from 'react';
import type { FormProps } from 'antd';

/**
 * Как выглядит форма во всём редакторе: подпись слева, поле справа.
 *
 * Одна раскладка на карточку записи, шторку свойства и окно настроек — иначе
 * поля в соседних окнах стоят по-разному, и это первое, что бросается в глаза.
 * Подписи выровнены по правому краю и прижаты к полю: так взгляд идёт
 * по одной линии, а не скачет по ширине самого длинного слова.
 */

/**
 * Колонки долями сетки, а не в пикселях: при `flex` строка переносится, как
 * только содержимое не влезает, — и поле с длинной подсказкой уезжало под
 * подпись во всю ширину. Доли этого не делают: ширина колонки не зависит
 * от того, что в ней лежит.
 */
const LABEL_SPAN = 6;

/** Звёздочка обязательного поля — после подписи, а не перед ней. */
const requiredMark = (label: ReactNode, { required }: { required: boolean }) => (
  <>
    {label}
    {required ? <span style={{ color: '#ff4d4f', marginInlineStart: 4 }}>*</span> : null}
  </>
);

export const FORM_LAYOUT: Pick<
  FormProps,
  'layout' | 'labelCol' | 'wrapperCol' | 'labelAlign' | 'colon' | 'requiredMark'
> = {
  layout: 'horizontal',
  labelCol: { span: LABEL_SPAN },
  wrapperCol: { span: 24 - LABEL_SPAN },
  labelAlign: 'right',
  // Двоеточие после подписи не нужно: колонка и так отделяет её от поля
  colon: false,
  requiredMark,
};
