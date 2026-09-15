import { useMemo, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { scrollToLine } from '../editor/bridge';
import { ThemePanel } from '../domains/theme/ThemePanel';

/** 层级样式：缩进 + 字重 + 颜色逐级递减，让标题层级一眼可辨 */
const LEVEL_STYLE: Record<number, string> = {
  1: 'pl-3 text-[13px] font-semibold text-ink-strong',
  2: 'pl-6 text-[13px] text-ink',
  3: 'pl-9 text-[12.5px] text-ink-soft',
  4: 'pl-12 text-xs text-ink-soft',
  5: 'pl-14 text-xs text-ink-soft/80',
  6: 'pl-16 text-xs text-ink-soft/80',
};

type Tab = 'outline' | 'theme';

const TAB_LABELS: Record<Tab, string> = {
  outline: '大纲',
  theme: '主题',
};

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('outline');
  const outline = useEditorStore((s) => s.outline);
  const instance = useEditorStore((s) => s.instance);
  const stats = useEditorStore((s) => s.stats);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);

  // 高亮当前光标所处的标题：取最后一个行号不超过光标的大纲项
  const activeIndex = useMemo(() => {
    const cursorLine = stats?.line ?? 0;
    let index = -1;
    outline.forEach((item, i) => {
      if (item.line <= cursorLine) index = i;
    });
    return index;
  }, [outline, stats?.line]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      {/* 头部 48px + 1px 底线 = 49px，与编辑区工具栏、预览区头部三者等高对齐 */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-chrome px-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded px-2.5 py-1.5 text-[13px] transition-colors ${
              tab === item
                ? 'bg-control text-ink-strong'
                : 'text-ink-soft hover:bg-control hover:text-ink'
            }`}
          >
            {TAB_LABELS[item]}
          </button>
        ))}

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="收起侧栏"
          title="收起侧栏"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-control hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3.5L5.5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {tab === 'outline' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {outline.length === 0 ? (
            <p className="px-2 py-3 text-xs text-ink-soft/70">暂无标题</p>
          ) : (
            <nav className="flex flex-col">
              {outline.map((item, index) => (
                <button
                  key={`${item.line}-${index}`}
                  type="button"
                  onClick={() => {
                    if (instance) scrollToLine(instance, item.line);
                  }}
                  className={`truncate rounded py-1 pr-2 text-left transition-colors hover:bg-control ${
                    LEVEL_STYLE[item.level] ?? 'pl-16 text-xs text-ink-soft/80'
                  } ${index === activeIndex ? 'bg-accent/10 text-accent' : ''}`}
                  title={item.text}
                >
                  {item.text || '（无标题）'}
                </button>
              ))}
            </nav>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ThemePanel />
        </div>
      )}
    </aside>
  );
}
