import { CODE_BLOCK_THEMES, PREVIEW_TEMPLATES } from './templates';
import { useEditorStore } from '../../store/useEditorStore';

/**
 * 主题面板：排版模板、代码块配色、自定义 CSS。
 * 所有切换只改 CSS 变量或 data 属性，不触发编辑器重建与内容重解析。
 */
export function ThemePanel() {
  const previewTemplate = useEditorStore((s) => s.previewTemplate);
  const setPreviewTemplate = useEditorStore((s) => s.setPreviewTemplate);
  const codeTheme = useEditorStore((s) => s.codeTheme);
  const setCodeTheme = useEditorStore((s) => s.setCodeTheme);
  const customCss = useEditorStore((s) => s.customCss);
  const setCustomCss = useEditorStore((s) => s.setCustomCss);
  const splitView = useEditorStore((s) => s.splitView);
  const toggleSplitView = useEditorStore((s) => s.toggleSplitView);

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto p-4 text-sm">
      {!splitView && (
        <p className="rounded border border-cinnabar/30 bg-cinnabar/5 px-3 py-2 text-xs text-ink-soft">
          模板与自定义 CSS 作用于右侧样式预览栏。
          <button type="button" className="mx-1 text-cinnabar underline" onClick={toggleSplitView}>
            开启双栏
          </button>
          后即可实时查看效果。
        </p>
      )}

      <section>
        <h3 className="mb-2 font-medium">排版模板</h3>
        <div className="flex flex-col gap-1">
          {PREVIEW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setPreviewTemplate(tpl.id)}
              className={`flex items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors ${
                previewTemplate === tpl.id
                  ? 'bg-ink/10 text-ink'
                  : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <span>{tpl.label}</span>
              <span className="text-xs text-ink-soft">{tpl.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-medium">代码块配色</h3>
        <div className="flex gap-1">
          {CODE_BLOCK_THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCodeTheme(item.id)}
              className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors ${
                codeTheme === item.id
                  ? 'bg-ink/10 text-ink'
                  : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-48 flex-1 flex-col">
        <h3 className="mb-2 font-medium">自定义 CSS</h3>
        <textarea
          value={customCss}
          onChange={(event) => setCustomCss(event.target.value)}
          spellCheck={false}
          placeholder={'.md-preview h1 {\n  color: #b23a2e;\n}'}
          className="w-full flex-1 resize-none rounded border border-ink/15 bg-surface p-2 font-mono text-xs text-ink outline-none focus:border-cinnabar/50"
        />
        <p className="mt-1.5 text-xs text-ink-soft">规则自动限定在预览栏内，不影响编辑器界面。</p>
      </section>
    </div>
  );
}
