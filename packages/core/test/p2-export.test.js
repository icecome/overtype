/**
 * P2 转换导出 tests:
 *  - htmlToMarkdown: HTML -> Markdown 转换
 *  - installPasteHTML: 粘贴 text/html 转 Markdown 插入
 *  - 导出方法：HTML / 微信 / 知乎 / PDF(print 桩)
 *  - window 外壳转发导出 API
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>', { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Event = dom.window.Event;
global.CSS = { supports: () => false };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { htmlToMarkdown, installPasteHTML } = await import('../src/p2-copy.js');
const { exportHTML, exportWeChat, exportZhihu, exportPDF } = await import('../src/p2-export.js');
const { OverType } = await import('../src/overtype.js');

let passed = 0, failed = 0;
function assert(cond, name, msg = '') {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}: ${msg}`); }
}
function includes(actual, expected, name) {
  assert(actual.includes(expected), name, `期望包含「${expected}」，实际「${actual}」`);
}

console.log('Running P2 转换导出 tests...\n');

// ---- htmlToMarkdown ----
(() => {
  const md = htmlToMarkdown('<h2>标题</h2><p><strong>加粗</strong> 与 <em>斜体</em> 和 <code>x=1</code></p>');
  includes(md, '## 标题', 'h2 -> ##');
  includes(md, '**加粗**', 'strong -> **');
  includes(md, '*斜体*', 'em -> *');
  includes(md, '`x=1`', 'code -> 反引号');
})();

(() => {
  const md = htmlToMarkdown('<p>访问 <a href="https://a.b">链接</a></p>');
  includes(md, '[链接](https://a.b)', 'a -> [text](href)');
})();

(() => {
  const md = htmlToMarkdown('<ul><li>一</li><li><ul><li>二</li></ul></li></ul>');
  includes(md, '- 一', 'ul 无序项');
  includes(md, '- 二', '嵌套无序项');
})();

(() => {
  const md = htmlToMarkdown('<ol><li>甲</li><li>乙</li></ol>');
  includes(md, '1. 甲', 'ol 有序起始 1');
  includes(md, '2. 乙', 'ol 有序后续 2');
})();

(() => {
  const md = htmlToMarkdown('<blockquote><p>引用行</p></blockquote>');
  includes(md, '> 引用行', 'blockquote -> "> "');
})();

(() => {
  const md = htmlToMarkdown('<table><tr><th>列A</th><th>列B</th></tr><tr><td>1</td><td>2</td></tr></table>');
  includes(md, '| 列A | 列B |', '表格表头');
  includes(md, '| --- | --- |', '表格分隔行');
  includes(md, '| 1 | 2 |', '表格数据行');
})();

(() => {
  const md = htmlToMarkdown('<pre>const a = 1;</pre>');
  includes(md, '```', 'pre -> 围栏代码');
  includes(md, 'const a = 1;', 'pre 保留原文');
})();

(() => {
  const md = htmlToMarkdown('<img src="/x.png" alt="示意图">');
  includes(md, '![示意图](/x.png)', 'img -> ![alt](src)');
})();

(() => {
  assert(htmlToMarkdown('') === '', '空串 -> 空串');
  assert(htmlToMarkdown('   ') === '', '空白串 -> 空串');
})();

// ---- installPasteHTML ----
(async () => {
  document.body.innerHTML = '<div id="pe"></div>';
  const editor = new OverType('#pe', { value: '起始', pasteHTML: true })[0];
  const ta = editor.textarea;
  ta.focus();
  ta.setSelectionRange(2, 2); // 结尾
  const ev = new dom.window.Event('paste', { bubbles: true, cancelable: true });
  let prevented = false;
  ev.preventDefault = () => { prevented = true; };
  ev.clipboardData = { getData: (t) => (t === 'text/html' ? '<p><strong>粘贴</strong></p>' : '') };
  ta.dispatchEvent(ev);
  assert(prevented, 'pasteHTML 拦截 text/html 粘贴');
  includes(ta.value, '**粘贴**', 'HTML 已转 Markdown 插入');
  assert(ta.value === '起始**粘贴**', '插入位置正确', ta.value);

  // 纯文本粘贴不应被拦截
  const ev2 = new dom.window.Event('paste', { bubbles: true, cancelable: true });
  let prevented2 = false;
  ev2.preventDefault = () => { prevented2 = true; };
  ev2.clipboardData = { getData: (t) => (t === 'text/html' ? '' : 'plain') };
  ta.dispatchEvent(ev2);
  assert(!prevented2, '纯文本粘贴不拦截');

  // destroy 后卸载监听
  editor.destroy();
  const ev3 = new dom.window.Event('paste', { bubbles: true, cancelable: true });
  let prevented3 = false;
  ev3.preventDefault = () => { prevented3 = true; };
  ev3.clipboardData = { getData: () => '<b>a</b>' };
  const gone = document.getElementById('pe');
  if (gone) {
    const ta2 = gone.querySelector('.overtype-input');
    if (ta2) ta2.dispatchEvent(ev3);
  }
  assert(!prevented3, 'destroy 后移除粘贴监听');
})();

// ---- 导出 HTML / 微信 / 知乎 ----
(async () => {
  document.body.innerHTML = '<div id="ee"></div>';
  const editor = new OverType('#ee', {
    value: '# 标题\n\n**加粗** 内容 [链接](https://a.b)\n\n```js\nconst x = 1;\n```\n\n> 引用'
  })[0];

  const html = editor.exportHTML('导出标题');
  assert(html.includes('<!DOCTYPE html>'), 'HTML 导出含 DOCTYPE');
  assert(html.includes('<title>导出标题</title>'), 'HTML 导出含标题');
  assert(html.includes('<h1>标题</h1>'), 'HTML 导出含渲染后标题');

  const wechat = editor.exportWeChat();
  includes(wechat, '<pre', '微信导出含 pre');
  assert(/background-color:\s*rgb\(246,\s*248,\s*250\)|#f6f8fa/.test(wechat) || wechat.includes('#f6f8fa'),
    '微信导出 pre 内联背景色', wechat.slice(0, 120));

  const zhihu = editor.exportZhihu();
  assert(zhihu.includes('nofollow'), '知乎导出的链接含 rel=nofollow');

  editor.destroy();
})();

// ---- PDF（桩） ----
(async () => {
  let opened = 0;
  const docStr = [];
  const fakeWin = {
    document: { write: (s) => docStr.push(s), close: () => {} },
    close: () => {}, focus: () => {}, print: () => { opened++; }
  };
  global.window = dom.window;
  dom.window.open = () => fakeWin;
  document.body.innerHTML = '<div id="pdf"></div>';
  const editor = new OverType('#pdf', { value: '**PDF 内容**' })[0];
  editor.exportPDF('PDF标题');
  assert(opened === 1, 'PDF 触发打印对话框');
  assert(docStr.join('').includes('PDF标题'), 'PDF 文档含标题');
  global.window = dom.window;
  editor.destroy();
})();

// ---- window 外壳转发 ----
(async () => {
  document.body.innerHTML = '<div id="we"></div>';
  const shell = new OverType('#we', {
    medium: 'window', value: '# 外壳', title: '外壳标题', pasteHTML: true
  })[0];
  assert(typeof shell.exportHTML === 'function', 'window 外壳提供 exportHTML');
  assert(typeof shell.exportWeChat === 'function', 'window 外壳提供 exportWeChat');
  assert(typeof shell.exportZhihu === 'function', 'window 外壳提供 exportZhihu');
  assert(typeof shell.exportPDF === 'function', 'window 外壳提供 exportPDF');
  assert(shell.getRenderedHTML({ cleanHTML: true }).includes('<h1>外壳</h1>'), 'window 外壳透传 getRenderedHTML');
  assert(shell.exportHTML('自定义').includes('<title>自定义</title>'), 'window 外壳 exportHTML 用显式标题');
  assert(shell.exportHTML().includes('<title>外壳标题</title>'), 'window 外壳 exportHTML 回退到标题框');
  shell.destroy();
})();

// ---- renderInto（E3 样式预览栏渲染）----
(async () => {
  document.body.innerHTML = '<div id="ri"></div><div id="riTarget"></div>';
  const editor = new OverType('#ri', { value: '# 预览标题\n\n正文 **加粗** 内容' })[0];
  const target = document.getElementById('riTarget');

  editor.renderInto(target);
  assert(target.innerHTML.includes('<h1>预览标题</h1>'), 'renderInto 渲染标题', target.innerHTML.slice(0, 80));
  assert(target.innerHTML.includes('<strong>加粗</strong>'), 'renderInto 渲染加粗', target.innerHTML.slice(0, 80));
  assert(!target.innerHTML.includes('syntax-marker'), 'renderInto 默认剥离 syntax-marker');

  // 传入空目标应安全返回，不抛错
  editor.renderInto(null);
  assert(true, 'renderInto(null) 安全返回');
  editor.destroy();
})();

setTimeout(() => {
  console.log('\n-------------------------');
  console.log(`P2 tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}, 100);