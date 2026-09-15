/**
 * P3 tests: extended toolbar (more panel / groups), i18n, markdown formatting actions,
 * and the readonly syntax tree (getSyntaxTree / MarkdownParser.buildTree).
 */

import { JSDOM } from 'jsdom';
import { OverType } from '../src/overtype.js';
import { MarkdownParser } from '../src/parser.js';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/'
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.CustomEvent = dom.window.CustomEvent;
global.CSS = { supports: () => false };
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const results = { passed: 0, failed: 0 };
function assert(condition, testName, message) {
  if (condition) {
    results.passed++;
    console.log(`✓ ${testName}`);
  } else {
    results.failed++;
    console.error(`✗ ${testName}: ${message}`);
  }
}

function resetDOM() {
  document.body.innerHTML = '<div id="editor"></div>';
}

function createEditor(options = {}) {
  resetDOM();
  return new OverType('#editor', {
    toolbar: true,
    value: '# Hello',
    ...options
  })[0];
}

function getToolbarButtons(editor) {
  return Array.from(editor.toolbar.container.querySelectorAll('.overtype-toolbar-button'));
}

function openMorePanel(editor) {
  const moreBtn = editor.toolbar.buttons.more;
  moreBtn.click();
  return editor.toolbar.morePanel;
}

console.log('🧪 Running P3 Toolbar / i18n / Syntax Tree Tests...\n');
console.log('━'.repeat(50));

// ── 「更多」面板 ──
(() => {
  const editor = createEditor();
  const buttons = getToolbarButtons(editor);

  // more 触发器存在于常显 bar
  const moreBtn = buttons.find(b => b.dataset.button === 'more');
  assert(!!moreBtn, 'Default toolbar includes a "more" trigger', 'Expected a "more" button');

  // 打开「更多」面板且包含按 group 分组项
  const panel = openMorePanel(editor);
  assert(!!panel, 'More panel opens on trigger click', 'Expected morePanel to be created');

  const groupTitles = Array.from(panel.querySelectorAll('.overtype-more-group-title'))
    .map(el => el.textContent);
  const moreItems = Array.from(panel.querySelectorAll('.overtype-more-item'));
  assert(moreItems.length >= 15, 'More panel contains extended items', `Expected >=15 items, got ${moreItems.length}`);
  assert(
    groupTitles.includes('格式') && groupTitles.includes('块') && groupTitles.includes('插入'),
    'More panel groups by 格式/块/插入',
    `Got groups: ${groupTitles.join(', ')}`
  );

  // 点击更多项触发对应动作（如 formatDocument）
  editor.setValue('## t\n\ntext');
  editor.textarea.selectionStart = 0;
  editor.textarea.selectionEnd = 0;
  const formatItem = panel.querySelector('[data-button="formatDoc"]');
  formatItem.click();
  assert(!editor.toolbar.morePanel, 'More panel closes after item click', 'Expected panel to close');

  // 再次打开后关闭
  openMorePanel(editor);
  editor.toolbar.buttons.more.click();
  assert(!editor.toolbar.morePanel, 'More panel toggles closed on second trigger click', 'Expected panel closed');

  editor.destroy();
})();

// ── i18n 默认中文 ──
(() => {
  const editor = createEditor();
  assert(
    editor.toolbar.container.getAttribute('aria-label') === '格式工具栏',
    'Default toolbar label is localized (zh)',
    `Got ${editor.toolbar.container.getAttribute('aria-label')}`
  );
  assert(
    editor.toolbar.buttons.bold.title === '加粗 (Ctrl+B)' && editor.toolbar.buttons.bold.getAttribute('aria-label') === '加粗 (Ctrl+B)',
    'Button title is localized (zh)',
    `Got ${editor.toolbar.buttons.bold.title}`
  );
  editor.destroy();
})();

// ── i18n 英文 ──
(() => {
  const editor = createEditor({ lang: 'en' });
  assert(
    editor.toolbar.container.getAttribute('aria-label') === 'Formatting toolbar',
    'Toolbar label switches to en',
    `Got ${editor.toolbar.container.getAttribute('aria-label')}`
  );
  assert(
    editor.toolbar.buttons.bold.title === 'Bold (Ctrl+B)',
    'Button title switches to en',
    `Got ${editor.toolbar.buttons.bold.title}`
  );
  editor.destroy();
})();

// ── getSyntaxTree ──
(() => {
  const editor = createEditor({
    value: [
      '# Title',
      '',
      '- one',
      '- **two**',
      '',
      '> quote',
      '',
      '```js',
      'const a = 1;',
      '```'
    ].join('\n')
  });

  const tree = editor.getSyntaxTree();
  assert(tree.type === 'document' && Array.isArray(tree.children), 'getSyntaxTree returns document node', 'Expected document AST');

  const types = tree.children.map(n => n.type);
  assert(
    types.includes('heading') && types.includes('list') && types.includes('blockquote') && types.includes('code'),
    'AST recognizes heading/list/blockquote/code',
    `Got types: ${types.join(', ')}`
  );

  const heading = tree.children.find(n => n.type === 'heading');
  assert(heading.level === 1 && heading.text === 'Title', 'AST heading level/text', `Got level=${heading.level} text=${heading.text}`);

  const list = tree.children.find(n => n.type === 'list');
  assert(list.items.length === 2 && list.items[1].inline.some(s => s.type === 'bold'), 'AST list items + inline bold', 'List parse failed');

  editor.destroy();
})();

// ── MarkdownParser.buildTree standalone ──
(() => {
  const tree = MarkdownParser.buildTree('| a | b |\n|---|---|\n| 1 | 2 |\n');
  assert(tree.children.some(n => n.type === 'table'), 'buildTree recognizes tables', 'Expected a table node');

  const t = tree.children.find(n => n.type === 'table');
  assert(t.header.length === 2 && t.rows.length === 1 && t.rows[0][1] === '2', 'Table header/rows parsed', 'Table cell parse failed');
})();

console.log('\n' + '━'.repeat(50));
console.log('\n📊 Test Results Summary\n');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Total:  ${results.passed + results.failed}`);
console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed > 0) {
  process.exit(1);
}