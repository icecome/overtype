import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useEditorStore } from '../store/useEditorStore';

/** 左栏最小宽度，沿用 overtype-window.js 的 resizer 手感 */
const MIN_PANE = 140;
/** 右栏至少保留的宽度 */
const MIN_RIGHT = 200;

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
}

/**
 * 编辑区与样式预览栏的双栏容器，中间分隔条可拖拽。
 *
 * 左栏（编辑器宿主）始终挂载、只改变宽度：若按 splitView 条件切换左右结构，
 * React 会因组件树位置变化卸载并重建编辑器，导致内容丢失。
 */
export function SplitPane({ left, right }: SplitPaneProps) {
  const splitView = useEditorStore((s) => s.splitView);
  const ratio = useEditorStore((s) => s.splitRatio);
  const setSplitRatio = useEditorStore((s) => s.setSplitRatio);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const applyFromClientX = useCallback(
    (clientX: number) => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      const x = clientX - box.left;
      const maxLeft = Math.max(MIN_PANE, box.width - MIN_RIGHT);
      const clamped = Math.min(Math.max(x, MIN_PANE), maxLeft);
      setSplitRatio(clamped / box.width);
    },
    [setSplitRatio]
  );

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      applyFromClientX(event.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [applyFromClientX]);

  return (
    <div ref={wrapRef} className="flex h-full min-h-0 w-full">
      <div
        className="min-w-0 overflow-hidden"
        style={{ width: splitView ? `${ratio * 100}%` : '100%' }}
      >
        {left}
      </div>

      {splitView && (
        <>
          {/*
            视觉为 1px 细线，命中区用 after 伪元素向两侧各扩 6px——
            1px 本身太窄拖不中，但 4px 实心条在视觉上又过重。
          */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整编辑区与预览区宽度"
            className="relative w-px shrink-0 cursor-col-resize bg-line-strong transition-colors after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] hover:bg-accent"
            onMouseDown={() => {
              draggingRef.current = true;
            }}
          />
          <div className="min-w-0 flex-1 overflow-hidden">{right}</div>
        </>
      )}
    </div>
  );
}
