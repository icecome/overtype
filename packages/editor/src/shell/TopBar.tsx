import { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';

const STORAGE_KEY = 'overtypeplus:title';

/** 品牌标识。朱砂点改为 accent，与激活态共用同一套强调色 */
export function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      <span className="text-sm font-semibold tracking-tight text-ink-strong">OverTypePlus</span>
    </div>
  );
}

/** 文档标题。仅作为文件名记忆，不参与正文内容 */
export function TitleField() {
  const [title, setTitle] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '未命名文档');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, title);
  }, [title]);

  return (
    <input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      aria-label="文档标题"
      placeholder="未命名文档"
      className="w-44 min-w-0 rounded-md bg-transparent px-2 py-1 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 hover:bg-control focus:bg-control focus:text-ink-strong"
    />
  );
}

export function SaveIndicator() {
  const dirty = useEditorStore((s) => s.dirty);
  return <span className="shrink-0 text-xs text-ink-soft">{dirty ? '未保存' : '已保存'}</span>;
}

/** 明暗切换。只改 html[data-theme] 的 CSS 变量，不触发组件树重渲染 */
export function ThemeToggle() {
  const dark = useEditorStore((s) => s.dark);
  const toggleDark = useEditorStore((s) => s.toggleDark);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="暗色模式"
      onClick={toggleDark}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        dark ? 'bg-accent' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          dark ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
