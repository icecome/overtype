import type { OverTypeInstance, SyntaxTreeNode } from 'overtypeplus';
import type { OutlineItem } from '../store/useEditorStore';

/** 合并高频回调：wait 毫秒内只执行最后一次 */
export function createThrottledScheduler(wait: number) {
  let timer: number | null = null;
  let pending: (() => void) | null = null;

  return (job: () => void) => {
    pending = job;
    if (timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      const next = pending;
      pending = null;
      next?.();
    }, wait);
  };
}

function normalizeNodes(tree: unknown): SyntaxTreeNode[] {
  if (Array.isArray(tree)) return tree as SyntaxTreeNode[];
  const root = tree as { children?: SyntaxTreeNode[] } | null | undefined;
  return root?.children ?? [];
}

/** 从语法树提取标题。树的形状可能是数组或带 children 的根节点，这里两种都兼容。 */
export function extractOutline(tree: unknown): OutlineItem[] {
  const items: OutlineItem[] = [];
  for (const node of normalizeNodes(tree)) {
    if (node?.type === 'heading' && typeof node.line === 'number') {
      items.push({
        line: node.line,
        level: node.level ?? 1,
        text: node.text ?? '',
      });
    }
  }
  return items;
}

/**
 * 跳转到指定行（0 基）。先按平均行高粗定位，再借选区把光标滚入视野——
 * 后者依赖浏览器原生的光标可见性滚动，比自行计算行高更稳。
 */
export function scrollToLine(instance: OverTypeInstance, line: number) {
  const { textarea } = instance;
  const lines = instance.getValue().split('\n');
  const target = Math.max(0, Math.min(line, lines.length - 1));

  const avgLineHeight = textarea.scrollHeight / Math.max(lines.length, 1);
  textarea.scrollTop = Math.max(0, target * avgLineHeight - avgLineHeight);

  const offset = lines.slice(0, target).reduce((sum, text) => sum + text.length + 1, 0);
  textarea.focus();
  textarea.setSelectionRange(offset, offset);
}
