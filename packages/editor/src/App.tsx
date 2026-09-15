import { useEffect } from 'react';
import { OverTypeHost } from './editor/OverTypeHost';
import { MenuBar } from './shell/MenuBar';
import { Brand, TitleField, SaveIndicator, ThemeToggle } from './shell/TopBar';
import { StatusBar } from './shell/StatusBar';
import { SidePanel } from './shell/SidePanel';
import { SplitPane } from './shell/SplitPane';
import { StylePreview } from './shell/StylePreview';
import { applyToolbarTheme } from './lib/chrome-theme';
import { useEditorStore } from './store/useEditorStore';

export default function App() {
  const immersive = useEditorStore((s) => s.immersive);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const toggleImmersive = useEditorStore((s) => s.toggleImmersive);
  const dark = useEditorStore((s) => s.dark);
  const instance = useEditorStore((s) => s.instance);

  // Esc 退出沉浸模式。编辑器本身始终保持挂载，避免卸载丢失内容
  useEffect(() => {
    if (!immersive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') toggleImmersive();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [immersive, toggleImmersive]);

  // 明暗：界面切换 CSS 变量，编辑器切换内核主题
  // 工具栏配色须在 setTheme 之后覆盖，顺序颠倒会被内核重新追加的主题变量盖掉
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    if (!instance) return;
    instance.setTheme(dark ? 'cave' : 'solar');
    applyToolbarTheme(instance, dark);
  }, [dark, instance]);

  const chrome = !immersive;

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      {chrome && (
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
          <Brand />
          {/* 菜单项自带等宽内边距，组内 gap 归零，间距由内边距决定 */}
          <nav className="flex items-center gap-0">
            <MenuBar />
          </nav>

          <div className="min-w-0 flex-1" />
          <TitleField />
          <SaveIndicator />
          <ThemeToggle />
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        {chrome && sidebarOpen && <SidePanel />}
        <main className="min-w-0 flex-1 overflow-hidden">
          <SplitPane left={<OverTypeHost />} right={<StylePreview />} />
        </main>
      </div>

      {chrome && <StatusBar />}
    </div>
  );
}
