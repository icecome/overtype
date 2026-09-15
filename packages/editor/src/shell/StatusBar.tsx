import { useEditorStore, type ViewMode } from '../store/useEditorStore';

const MODE_LABELS: Record<ViewMode, string> = {
  normal: '普通编辑',
  ir: '即时渲染',
  preview: '预览模式',
  plain: '纯文本',
};

export function StatusBar() {
  const stats = useEditorStore((s) => s.stats);
  const mode = useEditorStore((s) => s.mode);

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-chrome px-4 text-xs text-ink-soft">
      <span>字数 {stats?.words ?? 0}</span>
      <span>字符 {stats?.chars ?? 0}</span>
      <span>行数 {stats?.lines ?? 0}</span>
      <span className="ml-auto">
        行 {stats?.line ?? 0}，列 {stats?.column ?? 0}
      </span>
      <span className="text-accent">{MODE_LABELS[mode]}</span>
    </footer>
  );
}
