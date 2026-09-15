/**
 * P0 feature tests: autosave cache, code-copy button, GFM headings,
 * and enhanced shortcuts. Uses jsdom; localStorage is mocked.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><body><div id="e1"></div><div id="e2"></div></body>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.CSS = { supports: () => false };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const { OverType } = await import('../src/overtype.js');

let passed = 0, failed = 0;
function assert(cond, name, msg = '') {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}: ${msg}`); }
}

console.log('Running P0 feature tests...\n');

function key(patch) {
  return new dom.window.KeyboardEvent('keydown', {
    key: 'Digit1', code: 'Digit1', ctrlKey: true, cancellable: true, bubbles: true,
    ...patch
  });
}

// 1. Enhanced shortcuts: Ctrl+1 dispatches toggleH1 (spy; markdown-actions
//    functions are not resolvable under bare node ESM in test env)
(() => {
  const editor = new OverType('#e1', { value: 'Hello world' })[0];
  const ta = editor.textarea;
  ta.focus();
  ta.setSelectionRange(0, 0);
  let called = null;
  editor.performAction = (id) => { called = id; return Promise.resolve(); };
  editor.handleKeydown(key({ key: '1' }));
  assert(called === 'toggleH1', 'Ctrl+1 dispatches toggleH1', String(called));
  editor.destroy();
})();

// 2. disableShortcuts option blocks the same key
(() => {
  const editor = new OverType('#e1', { value: 'text', disableShortcuts: ['1'] })[0];
  const ta = editor.textarea;
  ta.focus();
  ta.setSelectionRange(0, 0);
  let called = null;
  editor.performAction = (id) => { called = id; return Promise.resolve(); };
  editor.handleKeydown(key({ key: '1' }));
  assert(called === null, 'disabled shortcut (1) does not dispatch', String(called));
  editor.destroy();
})();

// 3. GFM headings extraction
(async () => {
  const { p0Gfm } = await import('../src/p0-gfm.js');
  const g = p0Gfm();
  const hs = g.headings('# A\n\n## B\n\n### B');
  assert(hs.length === 3, 'headings() finds 3 headings');
  assert(hs[0].level === 1 && hs[0].anchor === 'a', 'H1 anchor correct');
  assert(hs[1].anchor === 'b' && hs[2].anchor === 'b-1', 'duplicate headings get unique anchors', JSON.stringify(hs));
})();

// 4. Code copy attached to window shell
(() => {
  const editor = new OverType('#e1', { medium: 'window', codeCopy: true, value: '```js\nconst x=1;\n```' })[0];
  const preview = editor.core.preview;
  editor.core.updatePreview();
  const copyBtn = preview.querySelector('pre .ow-copy-btn');
  assert(!!copyBtn, 'codeCopy adds a copy button to a code block');
  editor.destroy();
})();

// 5. Window autosave writes localStorage
(async () => {
  const editor = new OverType('#e2', { medium: 'window', autosave: { key: 'test-draft', interval: 10 } })[0];
  editor.setValue('## Draft\nContent');
  editor.setValue('Updated');
  await new Promise((r) => setTimeout(r, 60));
  assert(store['test-draft'] === 'Updated', 'autosave stores latest value', store['test-draft']);
  editor.destroy();
  assert(store['test-draft'] === undefined, 'destroy clears the draft');
  finish();
})();

function finish() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}