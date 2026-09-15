/**
 * Window-mode (medium: 'window') tests - the large editing-window shell.
 * Verifies DOM construction, core mounting, API forwarding, and teardown.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><body><div id="editor"></div></body>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.CSS = { supports: () => false };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { OverType } = await import('../src/overtype.js');

let passed = 0;
let failed = 0;
function assert(cond, name, msg = '') {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}: ${msg}`); }
}

console.log('Running Window-mode tests...\n');

const editorEl = document.getElementById('editor');
const shell = new OverType('#editor', {
  medium: 'window',
  placeholder: 'Draft',
  toolbar: true
})[0];

// 1. Shell DOM structure
const winEl = editorEl.querySelector('.overtype-window');
assert(winEl, 'shell root .overtype-window exists');
assert(winEl.querySelector('.ow-titlebar'), 'title bar exists');
assert(winEl.querySelector('.ow-outline'), 'outline panel exists');
assert(winEl.querySelector('.ow-statusbar'), 'status bar exists');
assert(winEl.querySelector('.ow-resizer'), 'resizer exists');
assert(winEl.querySelector('.ow-editor .overtype-container'), 'core mounted inside .ow-editor');

// 2. Public API forwarded to core
assert(shell.getValue() === '', 'getValue forwards to core');
shell.setValue('## Hello\n\nWorld');
assert(shell.getValue() === '## Hello\n\nWorld', 'setValue/getValue roundtrip');
assert(shell.container instanceof dom.window.HTMLElement, 'container getter exposes core container');

// 3. Mode forwarding (IR)
shell.showInstantRenderMode();
assert(shell.container.dataset.mode === 'ir', 'showInstantRenderMode forwarded');
shell.showNormalEditMode();
assert(shell.container.dataset.mode === 'normal', 'showNormalEditMode forwarded');

// 4. Outline reflects preview headings after render
const outlineItems = winEl.querySelectorAll('.ow-outline-item');
assert(outlineItems.length >= 1, 'outline lists the rendered heading', `got ${outlineItems.length}`);

// 5. Statusbar shows text/mode
const statusbar = winEl.querySelector('.ow-statusbar');
assert(statusbar.textContent.includes('词') && statusbar.textContent.includes('行'),
  'status bar populated', statusbar.textContent);

// 6. destroy tears down shell + core
shell.destroy();
assert(!editorEl.querySelector('.overtype-window'), 'destroy removes shell DOM');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);