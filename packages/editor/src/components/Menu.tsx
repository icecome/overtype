import { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
  checked?: boolean;
  divider?: boolean;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
}

/** 自绘下拉菜单。遵循菜单按钮语义：aria-haspopup / aria-expanded，Esc 与外部点击关闭。 */
export function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        // 统一内边距：菜单项靠盒子留白分隔，而非依赖字数的 gap
        className={`rounded px-2.5 py-1.5 text-[13px] transition-colors ${
          open ? 'bg-control text-ink-strong' : 'text-ink hover:bg-control hover:text-ink-strong'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-[1000] mt-1 min-w-52 rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          {items.map((item, index) =>
            item.divider ? (
              <div key={`divider-${index}`} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-control disabled:cursor-not-allowed disabled:text-ink-soft/40 disabled:hover:bg-transparent"
              >
                {/* 固定宽度的勾选槽，保证有/无勾选态的标签左边缘对齐 */}
                <span className="w-3 shrink-0 text-accent">{item.checked ? '✓' : ''}</span>
                <span>{item.label}</span>
                {item.hint && <span className="ml-auto pl-4 text-[11px] text-ink-soft">{item.hint}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
