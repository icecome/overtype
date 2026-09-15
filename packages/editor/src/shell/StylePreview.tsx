import { useEffect, useRef, useState } from 'react';
import { useEditorStore, type PreviewDevice } from '../store/useEditorStore';
import { registerPreview } from '../lib/scrollSync';
import { renderMarkdown } from '../lib/markdown-renderer';
import { inlinePreviewStyles, copyHtmlToClipboard } from '../lib/wechat-export';

// 数学 / Mermaid / Graphviz 等专业渲染：内核已导出 renderProfessional，
// 渲染完 marked HTML 后传入同一 DOM 容器，内核按需加载 KaTeX/Mermaid/Viz。
import { renderProfessional } from 'overtypeplus';

const DEVICE_OPTIONS: { id: PreviewDevice; label: string }[] = [
  { id: 'desktop', label: '桌面' },
  { id: 'mobile', label: '移动' },
];

type CopyState = 'idle' | 'done' | 'fail';

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="9" height="10.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 2.5h5v2h-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 样式预览栏：呈现套用排版模板与自定义 CSS 后的发布效果。
 *
 * 内容由 renderMarkdown 命令式填充（marked 渲染），容器保持为空（与 OverTypeHost
 * 同一纪律），避免 React 与命令式渲染互相覆盖。
 *
 * 模板与代码块配色经 data-* 属性切换，只改 CSS 变量，
 * 故不进入渲染依赖——切换主题不会重新解析 markdown。
 *
 * 滚动同步：桌面端滚动容器是外层 overflow-auto；移动端是 md-preview 自身
 * （h-full + overflow-auto，设备框内滚动），两个容器的 scroll 事件都能被
 * registerPreview 监听到。
 */
export function StylePreview() {
  const instance = useEditorStore((s) => s.instance);
  const stats = useEditorStore((s) => s.stats);
  const previewTemplate = useEditorStore((s) => s.previewTemplate);
  const codeTheme = useEditorStore((s) => s.codeTheme);
  const customCss = useEditorStore((s) => s.customCss);
  const previewDevice = useEditorStore((s) => s.previewDevice);
  const setPreviewDevice = useEditorStore((s) => s.setPreviewDevice);
  const hostRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const mobile = previewDevice === 'mobile';

  // 依赖只取 instance 与 stats：模板 / 代码主题 / 自定义 CSS 均为纯 CSS 变量切换
  useEffect(() => {
    if (!instance || !hostRef.current) return;
    // 重建 innerHTML 会重置滚动位置，先记录再恢复，避免输入时预览跳顶
    const scroller = mobile ? hostRef.current : scrollParentRef.current;
    const prevTop = scroller ? scroller.scrollTop : 0;
    let cancelled = false;
    // 走 marked 渲染而非 instance.renderInto：内核 parser 的输出结构（<span class="blockquote">、
    // 裸 <li> 无包裹等）与 preview-themes.css 期望的标准 HTML 不符，导致样式全数落空。
    // renderMarkdown 为 async（marked + hljs 动态 import），首次有加载延迟。
    renderMarkdown(instance.getValue()).then((html) => {
      if (cancelled || !hostRef.current) return;
      hostRef.current.innerHTML = html;
      if (scroller) scroller.scrollTop = prevTop;
      // 专业渲染（KaTeX / Mermaid / Graphviz）在 marked HTML 上做后处理，
      // 内核内部走 CDN 按需加载，不增加编辑器主包体积。
      renderProfessional(hostRef.current, { math: true, mermaid: true, graphviz: true });
    });
    return () => { cancelled = true; };
  }, [instance, stats, mobile]);

  // 滚动同步：注册当前预览滚动容器（桌面/移动切换时容器不同，需重注册）
  useEffect(() => {
    const scroller = mobile ? hostRef.current : scrollParentRef.current;
    registerPreview(scroller);
    return () => registerPreview(null);
  }, [mobile, instance, stats]);

  // 复制反馈自动复位
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), 1600);
    return () => clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    if (!instance || !hostRef.current) return;
    // 取预览区当前渲染 DOM，把计算样式内联后复制（与预览所见一致）：
    // 微信只接受富文本，内联样式保证标题/列表/配色/代码块在粘贴后保留。
    const html = inlinePreviewStyles(hostRef.current);
    // 诊断：把实际复制的 HTML 关键信息打到 console，方便排查
    // "QQ 邮箱粘贴后样式丢失" 的根因（inline style 没生成 vs 被目标程序清洗）。
    const bqTag = html.match(/<blockquote[^>]*>/)?.[0] ?? '(no blockquote)';
    console.info(
      '[wechat-export] html bytes=%d, first blockquote=%s',
      html.length,
      bqTag,
    );
    const ok = await copyHtmlToClipboard(html);
    setCopyState(ok ? 'done' : 'fail');
  };

  return (
    <div className="relative flex h-full flex-col bg-surface">
      {/* @scope 将用户 CSS 限制在预览栏内，避免污染编辑器界面 */}
      {customCss.trim() && <style>{`@scope (.md-preview) { ${customCss} }</style>`}</style>}

      {/* 头部 48px + 1px 底线 = 49px，与内核工具栏（8 padding + 32 按钮 + 8 + 1 边）等高 */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-chrome px-4">
        <span className="text-[13px] font-semibold text-ink">预览</span>

        <div className="ml-auto flex items-center gap-2">
          <div
            role="group"
            aria-label="预览视口"
            className="flex items-center gap-0.5 rounded-md bg-control p-0.5"
          >
            {DEVICE_OPTIONS.map((option) => {
              const active = previewDevice === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPreviewDevice(option.id)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? 'bg-surface text-ink-strong shadow-sm'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {option.id === 'desktop' ? <MonitorIcon /> : <MobileIcon />}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={scrollParentRef} className="min-h-0 flex-1 overflow-auto">
        {/*
          移动端：简洁矩形边框示意手机宽度（去掉机身边框、刘海等装饰）。
          md-preview 用 h-full + overflow-auto 在设备框内滚动，保证 scroll 事件
          落在 hostRef 上（registerPreview 移动端注册的就是它），滚动跟随才生效。
          关键点：md-preview 节点在两种模式下始终处于同一 DOM 位置，只改
          className，避免切换时 marked 渲染的内容随节点重建而丢失。
        */}
        <div className={mobile ? 'flex h-full justify-center p-6' : undefined}>
          <div
            ref={hostRef}
            className={
              mobile
                ? 'md-preview h-full w-[375px] overflow-auto rounded-lg border border-line bg-surface px-5 py-6 shadow-sm'
                : 'md-preview px-6 py-5'
            }
            data-template={previewTemplate}
            data-code-theme={codeTheme}
          />
        </div>
      </div>

      {/* 右侧悬浮工具按钮：复制到公众号（富文本），不随内容滚动 */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="复制到公众号"
        title="复制到公众号"
        className={`absolute bottom-4 right-4 z-10 flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs shadow-md transition-colors ${
          copyState === 'done'
            ? 'border-line bg-surface text-accent'
            : copyState === 'fail'
              ? 'border-line bg-surface text-ink-soft'
              : 'border-line bg-surface text-ink hover:bg-control'
        }`}
      >
        <ClipboardIcon />
        {copyState === 'done' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制公众号'}
      </button>
    </div>
  );
}
