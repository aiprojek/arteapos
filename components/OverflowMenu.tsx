import React, { useEffect, useRef, useState } from 'react';
import Button from './Button';
import Icon, { IconName } from './Icon';

interface OverflowMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  icon?: IconName;
  disabled?: boolean;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  label?: string;
  triggerIcon?: IconName;
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'utility' | 'operational';
  buttonClassName?: string;
  showLabelOnMobile?: boolean;
  matchTriggerWidth?: boolean;
}

const OverflowMenu: React.FC<OverflowMenuProps> = ({
  items,
  label = 'Lainnya',
  triggerIcon = 'menu',
  align = 'right',
  size = 'md',
  variant = 'secondary',
  buttonClassName,
  showLabelOnMobile = false,
  matchTriggerWidth = false,
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyles, setMenuStyles] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuBoxRef = useRef<HTMLDivElement>(null);
  const isFullWidthTrigger = !!buttonClassName?.split(' ').some(token => token === 'w-full');

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxWidth = Math.max(0, viewportWidth - 16);
      const triggerWidth = rect.width;
      const width = matchTriggerWidth ? Math.min(Math.max(triggerWidth, 180), maxWidth) : Math.min(240, maxWidth);
      const minWidth = matchTriggerWidth ? Math.min(triggerWidth, maxWidth) : Math.min(180, maxWidth);

      let left = align === 'right' ? rect.right - width : rect.left;
      left = Math.min(Math.max(8, left), viewportWidth - width - 8);

      const menuHeight = menuBoxRef.current?.getBoundingClientRect().height ?? 0;
      let top = rect.bottom + 8;
      if (menuHeight && top + menuHeight > viewportHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - 8);
      }

      setMenuStyles({ left, top, width, maxWidth, minWidth });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align]);

  if (!items.length) return null;

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={isFullWidthTrigger ? 'relative w-full' : 'relative'} ref={menuRef}>
      <div className={isFullWidthTrigger ? 'flex w-full' : 'inline-flex'} ref={buttonRef}>
        <Button
          variant={variant}
          size={size}
          onClick={() => setOpen((prev) => !prev)}
          className={`whitespace-nowrap flex-shrink-0 ${buttonClassName || ''}`}
        >
          <Icon name={triggerIcon} className={iconSize} />
          <span className={showLabelOnMobile ? 'inline' : 'hidden sm:inline'}>{label}</span>
        </Button>
      </div>
      {open && (
        <div
          ref={menuBoxRef}
          style={menuStyles}
          className="fixed max-h-[70vh] bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 overflow-hidden overflow-y-auto overflow-x-hidden"
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              disabled={item.disabled}
              className="w-full text-left px-4 py-2 text-xs text-white hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              {item.icon && <Icon name={item.icon} className="w-4 h-4" />}
              <span className="whitespace-normal break-words">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OverflowMenu;
