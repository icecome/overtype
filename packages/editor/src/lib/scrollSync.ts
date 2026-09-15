/**
 * 双向滚动同步：连接「编辑区」与「预览区」两个独立滚动容器。
 *
 * 二者属于不同的 DOM 子树（编辑区是内核实例的 textarea，预览区是 StylePreview
 * 里的 renderInto 容器），因此用单例管理器手动桥接。按滚动比例而非像素对齐，
 * 兼容内容高度不一致的两侧。用 syncing 标志防止回环触发。
 */

type Scroller = HTMLElement | null;

let editorEl: Scroller = null;
let previewEl: Scroller = null;
let syncing = false;

function ratioOf(el: HTMLElement): number {
  const max = el.scrollHeight - el.clientHeight;
  return max > 0 ? el.scrollTop / max : 0;
}

function setRatio(el: HTMLElement, ratio: number) {
  const max = el.scrollHeight - el.clientHeight;
  el.scrollTop = Math.max(0, Math.min(1, ratio)) * max;
}

function onEditorScroll() {
  if (syncing || !editorEl || !previewEl) return;
  syncing = true;
  setRatio(previewEl, ratioOf(editorEl));
  requestAnimationFrame(() => {
    syncing = false;
  });
}

function onPreviewScroll() {
  if (syncing || !editorEl || !previewEl) return;
  syncing = true;
  setRatio(editorEl, ratioOf(previewEl));
  requestAnimationFrame(() => {
    syncing = false;
  });
}

export function registerEditor(el: Scroller) {
  if (editorEl) editorEl.removeEventListener('scroll', onEditorScroll);
  editorEl = el;
  if (editorEl) editorEl.addEventListener('scroll', onEditorScroll, { passive: true });
}

export function registerPreview(el: Scroller) {
  if (previewEl) previewEl.removeEventListener('scroll', onPreviewScroll);
  previewEl = el;
  if (previewEl) previewEl.addEventListener('scroll', onPreviewScroll, { passive: true });
}
