import { Menu, type MenuItem } from '../components/Menu';
import { useEditorStore, type ViewMode } from '../store/useEditorStore';
import { downloadTextFile, pickTextFile } from '../lib/file';
import { exportStyledHTML } from '../lib/exporter';
import { runFormatAction } from '../lib/format';
import { renderMarkdown } from '../lib/markdown-renderer';
import { CODE_BLOCK_THEMES, PREVIEW_TEMPLATES } from '../domains/theme/templates';

const MODE_LABELS: Record<ViewMode, string> = {
  normal: '普通编辑',
  ir: '即时渲染',
  preview: '预览模式',
  plain: '纯文本',
};

const MODE_ORDER: ViewMode[] = ['normal', 'ir', 'preview', 'plain'];

/** 格式菜单项。actionId 须与内核 builtin 按钮名一致，见 toolbar-buttons.js */
const FORMAT_ITEMS: { label: string; actionId: string; hint?: string; dividerBefore?: boolean }[] = [
  { label: '加粗', actionId: 'bold', hint: 'Ctrl/⌘ B' },
  { label: '斜体', actionId: 'italic', hint: 'Ctrl/⌘ I' },
  { label: '下划线', actionId: 'underline', hint: 'Ctrl/⌘ U' },
  { label: '删除线', actionId: 'strike' },
  { label: '行内代码', actionId: 'code' },
  { label: '高亮', actionId: 'highlight' },
  { label: '标题 1', actionId: 'h1', dividerBefore: true },
  { label: '标题 2', actionId: 'h2' },
  { label: '标题 3', actionId: 'h3' },
  { label: '无序列表', actionId: 'bulletList', dividerBefore: true },
  { label: '有序列表', actionId: 'orderedList' },
  { label: '任务列表', actionId: 'taskList' },
  { label: '引用', actionId: 'quote' },
  { label: '代码块', actionId: 'codeBlock' },
  { label: '清除格式', actionId: 'clearFormat', dividerBefore: true },
];

export function MenuBar() {
  const instance = useEditorStore((s) => s.instance);
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const immersive = useEditorStore((s) => s.immersive);
  const toggleImmersive = useEditorStore((s) => s.toggleImmersive);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const splitView = useEditorStore((s) => s.splitView);
  const toggleSplitView = useEditorStore((s) => s.toggleSplitView);
  const dark = useEditorStore((s) => s.dark);
  const toggleDark = useEditorStore((s) => s.toggleDark);
  const previewTemplate = useEditorStore((s) => s.previewTemplate);
  const setPreviewTemplate = useEditorStore((s) => s.setPreviewTemplate);
  const codeTheme = useEditorStore((s) => s.codeTheme);
  const setCodeTheme = useEditorStore((s) => s.setCodeTheme);
  const customCss = useEditorStore((s) => s.customCss);
  const draftCache = useEditorStore((s) => s.draftCache);

  const switchMode = (next: ViewMode) => () => {
    if (!instance) return;
    if (next === 'normal') instance.showNormalEditMode();
    else if (next === 'ir') instance.showInstantRenderMode();
    else if (next === 'preview') instance.showPreviewMode();
    else instance.showPlainTextarea();
    setMode(next);
  };

  const fileItems: MenuItem[] = [
    {
      label: '导入 Markdown',
      onClick: () => {
        if (!instance) return;
        pickTextFile()
          .then((text) => {
            if (text !== null) instance.setValue(text);
          })
          .catch(() => undefined);
      },
    },
    { label: '', divider: true },
    {
      label: '导出 Markdown',
      onClick: () => instance && downloadTextFile('document.md', instance.getValue()),
    },
    {
      label: '导出 HTML',
      hint: '套用当前模板',
      onClick: () => {
        if (!instance) return;
        // 导出与预览栏共用同一份 marked 渲染，保证「所见即所得」
        renderMarkdown(instance.getValue()).then((bodyHtml) => {
          downloadTextFile(
            'document.html',
            exportStyledHTML({
              title: 'document',
              bodyHtml,
              template: previewTemplate,
              codeTheme,
              customCss,
            }),
            'text/html;charset=utf-8'
          );
        });
      },
    },
    {
      label: '导出 PDF',
      onClick: () => instance?.exportPDF('document'),
    },
    { label: '', divider: true },
    {
      label: '恢复记忆',
      hint: '载入本地草稿',
      onClick: () => {
        if (!draftCache) return;
        if (!window.confirm('恢复草稿将覆盖当前内容，确定继续？')) return;
        draftCache.restore();
      },
    },
    {
      label: '清除记忆',
      hint: '删除本地草稿',
      onClick: () => {
        if (!draftCache) return;
        if (!window.confirm('确定清除本地保存的草稿？当前内容不受影响。')) return;
        draftCache.clear();
      },
    },
  ];

  const formatItems: MenuItem[] = FORMAT_ITEMS.flatMap((item) => {
    const entry: MenuItem = {
      label: item.label,
      hint: item.hint,
      onClick: () => runFormatAction(instance, item.actionId),
    };
    return item.dividerBefore ? [{ label: '', divider: true }, entry] : [entry];
  });

  const functionItems: MenuItem[] = [
    { label: '查找与替换', disabled: true, hint: 'E5' },
    { label: '本地历史', disabled: true, hint: 'E5' },
    { label: '', divider: true },
    { label: '清空文档', onClick: () => instance?.setValue('') },
  ];

  const viewItems: MenuItem[] = [
    ...MODE_ORDER.map((item) => ({
      label: MODE_LABELS[item],
      checked: mode === item,
      onClick: switchMode(item),
    })),
    { label: '', divider: true },
    { label: '沉浸模式', checked: immersive, hint: '隐藏界面', onClick: toggleImmersive },
    { label: '大纲侧栏', checked: sidebarOpen, onClick: toggleSidebar },
    { label: '双栏样式预览', checked: splitView, hint: '可拖拽', onClick: toggleSplitView },
  ];

  const themeItems: MenuItem[] = [
    { label: '亮色主题', checked: !dark, onClick: () => dark && toggleDark() },
    { label: '暗色主题', checked: dark, onClick: () => !dark && toggleDark() },
    { label: '', divider: true },
    ...PREVIEW_TEMPLATES.map((template) => ({
      label: template.label,
      hint: template.hint,
      checked: previewTemplate === template.id,
      onClick: () => setPreviewTemplate(template.id),
    })),
  ];

  const codeThemeItems: MenuItem[] = CODE_BLOCK_THEMES.map((theme) => ({
    label: theme.label,
    hint: theme.hint,
    checked: codeTheme === theme.id,
    onClick: () => setCodeTheme(theme.id),
  }));

  const tutorialItems: MenuItem[] = [
    { label: 'Markdown 语法速查', disabled: true, hint: 'E2' },
    { label: '关于 OverTypePlus', disabled: true, hint: 'E2' },
  ];

  return (
    <>
      <Menu label="文件" items={fileItems} />
      <Menu label="格式" items={formatItems} />
      <Menu label="功能" items={functionItems} />
      <Menu label="查看" items={viewItems} />
      <Menu label="主题" items={themeItems} />
      <Menu label="代码主题" items={codeThemeItems} />
      <Menu label="教程" items={tutorialItems} />
    </>
  );
}
