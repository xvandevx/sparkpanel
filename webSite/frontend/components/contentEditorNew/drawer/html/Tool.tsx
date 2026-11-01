import { forwardRef, type ReactNode } from 'react';
import { Button, type ButtonProps } from 'antd';

/**
 * Одна кнопка панели: значок или короткая подпись, нажатая — подсвечена.
 * Через `forwardRef` и с остальными пропсами: её оборачивают `Popover`
 * и `Dropdown`, им нужны ссылка на кнопку и свои обработчики.
 */
const Tool = forwardRef<
  HTMLButtonElement,
  {
    title: string;
    icon?: ReactNode;
    label?: string;
    isActive?: boolean;
    isDisabled?: boolean;
  } & Omit<ButtonProps, 'title' | 'icon' | 'type' | 'size' | 'disabled'>
>(function Tool({ title, icon, label, isActive = false, isDisabled = false, ...rest }, ref) {
  return (
    <Button
      {...rest}
      ref={ref}
      size="small"
      type={isActive ? 'primary' : 'text'}
      title={title}
      aria-label={title}
      icon={icon}
      disabled={isDisabled}
    >
      {label}
    </Button>
  );
});

export default Tool;
