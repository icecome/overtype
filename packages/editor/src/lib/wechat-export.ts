/**
 * 复制到公众号的富文本导出。
 *
 * 目标与 markdown-nice 的 juice 方案一致：把排版样式内联到 HTML，
 * 让微信公众平台 / QQ 邮箱富文本编辑器粘贴时保留视觉。不引入 juice：
 * 预览 DOM 已由浏览器解析全部 CSS 变量、模板、代码主题与自定义 CSS，
 * getComputedStyle 拿到的即最终计算值，逐元素写入 inline style 即
 * "所见即所得"。
 *
 * 复制走 text/html + text/plain 双通道：富文本编辑器读 HTML，
 * 纯文本场景读去标签文本。
 *
 * 重要约束：QQ 邮箱 / 微信公众号等基于 contenteditable 的富文本编辑器
 * 只会识别 CSS 简写属性（`border-left: 4px solid #xxx`），不会把分写
 * 的 `border-left-width` / `-style` / `-color` 合并。所以 border 必须
 * 内联为四向简写。
 */

/** 简单属性（单一 CSS 属性，逐个内联） */
const SIMPLE_PROPS = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'text-align',
  'text-decoration',
  'letter-spacing',
  'white-space',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-radius',
  'list-style-type',
  'list-style-position',
  'display',
  // 不内联 'width'：块级元素的 computed width 是布局产物（如 547px），
  // 内联会固定宽度，在邮件正文容器里可能溢出或过窄；img 靠 max-width
  // 100% 自适应即可。
  'max-width',
] as const;

const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const;

/**
 * 把 src（在文档中）的计算样式写入 dest（克隆树）的对应节点。
 * 必须用文档中的原始节点取 getComputedStyle：detached 克隆节点不在文档中，
 * 浏览器只返回默认样式，不应用作者样式表规则（border、背景等会全空）。
 */
function inlineElementFrom(src: Element, dest: Element): void {
  const cs = getComputedStyle(src);
  const he = dest as HTMLElement;
  for (const prop of SIMPLE_PROPS) {
    const v = cs.getPropertyValue(prop);
    if (!v) continue;
    // QQ 邮箱 / 微信邮件富文本编辑器的 UA stylesheet 常对 blockquote
    // 用 !important 重置边条与底色，普通 inline style 会被覆盖。仅给
    // 关键视觉属性（背景、边条）加 !important，其余不加以免副作用。
    if (prop === 'background-color') {
      he.style.setProperty(prop, v, 'important');
    } else {
      he.style.setProperty(prop, v);
    }
  }
  // border 四向合并为简写：分写的 width/style/color 在 QQ 邮箱 / 微信
  // 富文本编辑器里无法被合并，粘贴后整条边消失。同上加 !important 提升
  // 优先级。style='none' 或 width='0px' 时跳过（不写内联，保留默认无边框）。
  for (const side of BORDER_SIDES) {
    const w = cs.getPropertyValue(`border-${side}-width`);
    const s = cs.getPropertyValue(`border-${side}-style`);
    const c = cs.getPropertyValue(`border-${side}-color`);
    if (s !== 'none' && w !== '0px') {
      he.style.setProperty(`border-${side}`, `${w} ${s} ${c}`, 'important');
    }
  }
}

/**
 * 克隆预览节点并把计算样式内联，返回可粘贴的 HTML 字符串。
 * 原树与克隆树结构相同（deep clone），按 querySelectorAll 文档序一一对应：
 * 取原节点的 computed style，写回克隆对应节点，最后序列化克隆树。
 */
export function inlinePreviewStyles(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  inlineElementFrom(root, clone);
  const srcEls = root.querySelectorAll('*');
  const destEls = clone.querySelectorAll('*');
  for (let i = 0; i < srcEls.length; i++) {
    inlineElementFrom(srcEls[i], destEls[i]);
  }
  return clone.outerHTML;
}

/** 去标签纯文本（text/plain 通道）。 */
export function toPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? '').trim();
}

/**
 * 富文本复制：ClipboardItem 优先（Chrome / Edge / Firefox），
 * execCommand 兜底（Safari）。text/plain 为去标签纯文本，避免
 * 目标程序只读 plain 时粘贴出 HTML 源码。
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  const plain = toPlainText(html);
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      return true;
    } catch {
      // 权限或格式不支持时回退 execCommand
    }
  }
  return execCopy(html, plain);
}

function execCopy(html: string, plain: string): boolean {
  const handler = (e: ClipboardEvent) => {
    e.preventDefault();
    e.clipboardData?.setData('text/html', html);
    e.clipboardData?.setData('text/plain', plain);
    document.removeEventListener('copy', handler);
  };
  document.addEventListener('copy', handler);
  try {
    const ok = document.execCommand('copy');
    document.removeEventListener('copy', handler);
    return ok;
  } catch {
    document.removeEventListener('copy', handler);
    return false;
  }
}
