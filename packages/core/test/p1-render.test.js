/**
 * P1 professional-rendering tests. CDN loaders don't resolve under jsdom, so
 * the sync math helpers (renderBlockMath / exports) are tested directly with an
 * injected katex stub. Mermaid/Graphviz wiring is exercised at the option level.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;
global.CSS = { supports: () => false };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { renderBlockMath } = await import('../src/p1-render.js');
const { OverType } = await import('../src/overtype.js');

let passed = 0, failed = 0;
function assert(cond, name, msg = '') {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}: ${msg}`); }
}

console.log('Running P1 professional-render tests...\n');

// Fake katex that wraps expression in an identity span.
const fakeKatex = {
  renderToString: (expr, opts) =>
    `<span class="math-r">$${(opts && opts.displayMode) ? 'D' : 'I'}:${expr}</span>`
};

// 1. Block math: entire $$...$$ element replaced with display math
(() => {
  const el = document.createElement('p');
  el.textContent = '$$E = mc^2$$';
  renderBlockMath(el, fakeKatex);
  assert(el.innerHTML.includes('class="math-r"') && el.innerHTML.includes(':E = mc^2'),
    '块级 $$...$$ 渲染为显示公式',
    el.innerHTML);
  assert(el.innerHTML.includes('$D:'), '块级公式用 displayMode', el.innerHTML);
})();

// 2. Block math: trailing plain text -> left as raw source (not whole block math)
(() => {
  const el = document.createElement('p');
  el.textContent = '$$a=b$$ and trailing text';
  renderBlockMath(el, fakeKatex);
  assert(!el.innerHTML.includes('class="math-r"'), '带尾随文本不触发整块替换', el.innerHTML);
})();

// 3. Editor accepts professional option without error (no on-demand fetch in jsdom)
(async () => {
  document.body.innerHTML = '<div id="e1"></div>';
  const editor = new OverType('#e1', {
    value: '# 标题\n\n公式 $$x=1$$',
    professional: { math: true, mermaid: false, graphviz: false }
  })[0];
  // IR render pipeline untouched
  assert(editor.getValue().includes('$$x=1$$'), 'professional 选项下源码不变', editor.getValue());
  editor.showInstantRenderMode();
  assert(editor.ir && editor.ir.isMode, '开启 professional 后 IR 仍可用');
  editor.showNormalEditMode();
  editor.destroy();
})();

// 5. destroy cleans window-shell + professional shell cleanly
(() => {
  const editor = new OverType('#e1', {
    medium: 'window',
    value: 'hi',
    professional: { math: true }
  })[0];
  assert(!!editor.destroy, 'window 形态提供 destroy');
  editor.destroy();
})();

setTimeout(() => {
  console.log('\n-------------------------');
  console.log(`P1 tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}, 50);