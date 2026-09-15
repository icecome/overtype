/**
 * Instant-render (IR) mode tests for OverType
 * Covers block splitting, mode switching, editing, and value synchronization
 */

import { JSDOM } from 'jsdom';
import { OverType } from '../src/overtype.js';
import { splitBlocks } from '../src/ir.js';

// Setup DOM
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="editor"></div>
    </body>
  </html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.Event = dom.window.Event;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.CSS = { supports: () => false };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);

let passed = 0;
let failed = 0;

function assert(condition, testName, message) {
  if (condition) {
    passed++;
    console.log(`✓ ${testName}`);
  } else {
    failed++;
    console.error(`✗ ${testName}: ${message}`);
  }
}

function dispatchInput(textarea) {
  textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
}

console.log('🧪 Running Instant-Render (IR) Mode Test...\n');
console.log('━'.repeat(50));

// ===== splitBlocks unit tests =====
console.log('\n📦 Block splitting\n');

(() => {
  const blocks = splitBlocks('# Title\n\nParagraph one\nParagraph two\n\n- item 1\n- item 2\n\n> quote');
  const types = blocks.map(b => b.type).join(',');
  assert(types === 'heading,empty,paragraph,empty,list,empty,quote',
    'splitBlocks produces correct block types', `got: ${types}`);

  const joined = blocks.map(b => b.text).join('\n');
  assert(joined === '# Title\n\nParagraph one\nParagraph two\n\n- item 1\n- item 2\n\n> quote',
    'splitBlocks join round-trips the source', `got: ${JSON.stringify(joined)}`);

  assert(blocks[0].start === 0 && blocks[1].start === 8,
    'block start offsets are correct', `got: ${blocks[0].start}, ${blocks[1].start}`);
})();

(() => {
  const src = '```js\nconst a = 1;\n**not bold**\n```\n\nafter code';
  const blocks = splitBlocks(src);
  assert(blocks[0].type === 'code' && blocks[0].text === '```js\nconst a = 1;\n**not bold**\n```',
    'code fence forms a single block', `got: ${blocks[0].text}`);
  assert(blocks.map(b => b.text).join('\n') === src, 'code block round-trips', '');
})();

(() => {
  const blocks = splitBlocks('');
  assert(blocks.length === 1 && blocks[0].text === '',
    'empty source yields one empty paragraph block', `got ${blocks.length} blocks`);
})();

// ===== IR mode integration tests =====
console.log('\n📝 IR mode integration\n');

let onChangeValues = [];
const [editor] = new OverType('#editor', {
  value: '# Heading\n\nFirst paragraph.\n\n- item one\n- item two\n\n```js\ncode here\n```\n\nClosing paragraph.',
  onChange: (value) => onChangeValues.push(value)
});

editor.showInstantRenderMode();

assert(editor.container.dataset.mode === 'ir', 'mode is set to ir', '');
assert(document.querySelector('.overtype-ir-container') !== null,
  'IR container is created', '');
assert(editor.wrapper.contains(document.querySelector('.overtype-ir-container')),
  'IR container lives inside the wrapper', '');

const blockEls = Array.from(editor.ir.container.querySelectorAll('.overtype-ir-block'));
assert(blockEls.length === 9,
  'document splits into 9 blocks (heading/empty/para/empty/list/empty/code/empty/para)',
  `got ${blockEls.length}`);

const activeEls = blockEls.filter(el => el.classList.contains('active'));
assert(activeEls.length === 1, 'exactly one active block', `got ${activeEls.length}`);
assert(activeEls[0] === blockEls[blockEls.length - 1],
  'last block is active on activation', '');
assert(activeEls[0].contains(editor.textarea),
  'textarea is moved into the active block', '');

assert(editor.getValue() === '# Heading\n\nFirst paragraph.\n\n- item one\n- item two\n\n```js\ncode here\n```\n\nClosing paragraph.',
  'getValue returns the full document in IR mode', `got: ${JSON.stringify(editor.getValue())}`);

assert(editor.textarea.value === 'Closing paragraph.',
  'textarea holds only the active block source', `got: ${JSON.stringify(editor.textarea.value)}`);

// Simulated editing in the active block
editor.textarea.value = 'Closing paragraph edited.';
dispatchInput(editor.textarea);

assert(editor.getValue().endsWith('Closing paragraph edited.'),
  'editing the active block updates the full value', `got: ${JSON.stringify(editor.getValue())}`);
assert(onChangeValues.length > 0 && onChangeValues[onChangeValues.length - 1] === editor.getValue(),
  'onChange receives the full document value', '');
assert(editor.ir.blocks[editor.ir.blocks.length - 1].text === 'Closing paragraph edited.',
  'block text is committed after input', '');

// Enter creates a new block
const valueBefore = editor.getValue();
editor.handleKeydown({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, preventDefault() {} });
const afterEnter = editor.getValue();
assert(afterEnter === valueBefore + '\n\n',
  'Enter appends a block boundary ("\\n\\n")', `got: ${JSON.stringify(afterEnter)}`);
assert(editor.ir.blocks[editor.ir.blocks.length - 1].text === '',
  'new empty block is active after Enter', `active text: ${JSON.stringify(editor.textarea.value)}`);

// Typing in the new empty block
editor.textarea.value = 'New block text';
dispatchInput(editor.textarea);
assert(editor.getValue().endsWith('\n\nNew block text'),
  'typing in the new block lands after the boundary', `got: ${JSON.stringify(editor.getValue())}`);

// Backspace at block start merges with previous block
const beforeMerge = editor.getValue();
editor.textarea.setSelectionRange(0, 0);
editor.handleKeydown({ key: 'Backspace', preventDefault() {} });
assert(editor.getValue() === beforeMerge.replace(/\nNew block text$/, 'New block text'),
  'Backspace at block start merges into previous block', `got: ${JSON.stringify(editor.getValue())}`);
assert(editor.textarea.value === 'New block text',
  'caret lands at merge point in previous block', `got: ${JSON.stringify(editor.textarea.value)}`);

// setValue round-trip
editor.setValue('# Fresh\n\nContent');
assert(editor.getValue() === '# Fresh\n\nContent', 'setValue updates value', '');
assert(editor.ir.container.querySelectorAll('.overtype-ir-block').length === 3,
  'blocks re-split after setValue', '');

// Switching back to normal mode
editor.showNormalEditMode();
assert(editor.container.dataset.mode === 'normal', 'mode restored to normal', '');
assert(document.querySelector('.overtype-ir-container') === null,
  'IR container removed on mode switch', '');
assert(editor.wrapper.firstElementChild === editor.textarea,
  'textarea restored as first wrapper child', '');
assert(editor.textarea.value === '# Fresh\n\nContent',
  'textarea holds full document after leaving IR', `got: ${JSON.stringify(editor.textarea.value)}`);
assert(editor.preview.querySelectorAll('div').length > 0,
  'normal preview re-rendered', '');

// Re-enter IR and verify state is rebuilt
editor.showInstantRenderMode();
assert(editor.ir.container.querySelectorAll('.overtype-ir-block').length === 3,
  'IR rebuilds blocks on re-entry', '');
assert(editor.getValue() === '# Fresh\n\nContent', 'value survives mode round-trip', '');

// getRenderedHTML / getPreviewHTML work in IR mode
const clean = editor.getCleanHTML();
assert(!clean.includes('syntax-marker'), 'getCleanHTML has no syntax markers in IR mode', '');

// setValue in IR mode does not steal focus from an external element
const outside = document.createElement('input');
document.body.appendChild(outside);
outside.focus();
editor.setValue('# Focus\n\nTest');
assert(document.activeElement === outside,
  'IR setValue does not steal focus', `activeElement: ${document.activeElement && document.activeElement.tagName}`);
assert(editor.getValue() === '# Focus\n\nTest', 'setValue value correct without focus steal', '');
document.body.removeChild(outside);

// Typing via the fast path keeps textarea focus (renderDiff refreshes in place)
editor.textarea.focus();
editor.textarea.value = 'plain typing';
dispatchInput(editor.textarea);
assert(document.activeElement === editor.textarea,
  'typing keeps textarea focus in IR mode', '');
assert(editor.getValue().endsWith('plain typing'),
  'fast-path typing updates the document', `got: ${JSON.stringify(editor.getValue())}`);

editor.destroy();

console.log('\n' + '━'.repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
