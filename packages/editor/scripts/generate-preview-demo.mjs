/**
 * 生成静态预览页：把 preview-themes.css 与真实渲染结果内联，
 * 用于在没有 dev server / 浏览器自动化的情况下人工核验排版。
 *
 * 直接 import 生产源码（依赖 Node 22 的 --experimental-strip-types），
 * 保证页面呈现的就是预览栏的实际输出。
 *
 * 运行：npm run demo:preview
 */
import { renderMarkdown } from '../src/lib/markdown-renderer.ts';
import { CODE_BLOCK_THEMES } from '../src/domains/theme/templates.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, '../src/styles/preview-themes.css');
const outPath = resolve(here, '../../../.workbuddy/preview-demo.html');

const sample = [
  '# OverTypePlus 预览排版核验',
  '',
  '正文段落：行高 / 段距 / 字体。此处混合 **粗体**、*斜体*、~~删除线~~、`行内代码` 与 ==高亮文本==，并含一个 [链接](https://example.com)。',
  '',
  '## 一、目录示例',
  '',
  '[TOC]',
  '',
  '## 二、引用层级',
  '',
  '> 一级引用：左侧粗线条纹 + 浅底。',
  '>',
  '> > 嵌套二级引用：边条变细、底色变浅。',
  '> >',
  '> > > 嵌套三级引用：仅保留细边框、无底色。',
  '',
  '## 三、列表层级',
  '',
  '### 无序（disc → circle → square）',
  '',
  '- 一层：无序列表 1',
  '- 一层：无序列表 2',
  '  - 二层：嵌套 2.1',
  '    - 三层：再嵌套 A',
  '    - 三层：再嵌套 B',
  '  - 二层：嵌套 2.2',
  '- 一层：无序列表 3',
  '',
  '### 有序（decimal → lower-alpha）',
  '',
  '1. 有序项一',
  '2. 有序项二',
  '3. 有序项三',
  '',
  '### 任务清单',
  '',
  '- [x] 已完成：接入 marked 渲染管线',
  '- [x] 已完成：恢复列表 marker + 多级引用',
  '- [x] 已完成：==高亮== / [TOC] 目录',
  '- [ ] 待办：校验导出到公众号的结构',
  '',
  '## 四、表格',
  '',
  '| 元素 | 说明 | 状态 |',
  '| --- | --- | --- |',
  '| 标题 | h1–h6 字号梯度 | 就绪 |',
  '| 引用 | 左边条 + 浅底，多级差异化 | 就绪 |',
  '| 列表 | 嵌套缩进 + 多种 marker | 就绪 |',
  '| 目录 | [TOC] 锚点导航 | 就绪 |',
  '',
  '## 五、代码块',
  '',
  '```js',
  'const renderer = new Marked({ extensions: [tocExtension] });',
  'renderer.code = ({ text, lang }) =>',
  '  `<pre class="code-block"><code>${text}</code></pre>`;',
  '```',
  '',
  '## 六、脚注',
  '',
  '正文段落引用脚注[^1]，并混用第二个[^2]验证多条目与锚点回跳。',
  '',
  '[^1]: 第一条脚注：描述性内容。',
  '',
  '[^2]: 第二条脚注：含 [链接](https://example.com) 与 `行内代码`。',
  '',
  '分割线：',
  '',
  '---',
  '',
  '## 七、收尾',
  '',
  '末段用于确认尾部间距未塌陷。',
].join('\n');

const css = readFileSync(cssPath, 'utf8');
const html = renderMarkdown(sample);

// 代码块主题对比区块：同一段代码在每套 data-code-theme 下的渲染
const codeSample = [
  '```js',
  '// 主题对比：同一段代码，不同代码块配色',
  'const greet = (name) => `Hello, ${name}!`;',
  'for (let i = 0; i < 3; i++) {',
  "  console.log(greet('OverTypePlus'));",
  '}',
  '```',
].join('\n');
const codeHtml = renderMarkdown(codeSample);
const themeSheets = CODE_BLOCK_THEMES.map(
  (t) => `
    <div class="sheet theme-sheet">
      <div class="theme-label">${t.label} <code class="theme-id">${t.id}</code></div>
      <div class="md-preview" data-code-theme="${t.id}">${codeHtml}</div>
    </div>`,
).join('');

writeFileSync(
  outPath,
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OverTypePlus 预览排版核验</title>
<style>
  body { margin: 0; background: #f5f6f7; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }
  .page { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; }
  .hint { margin: 0 0 20px; padding: 12px 16px; background: #fff; border: 1px solid rgba(31,41,55,.12);
          border-radius: 6px; font-size: 13px; color: #4b5563; line-height: 1.7; }
  .sheet { background: #fff; border: 1px solid rgba(31,41,55,.12); border-radius: 6px; padding: 40px 44px; }
  .section { margin: 30px 0 12px; font-size: 15px; font-weight: 600; color: #111827; }
  .theme-sheet { padding: 20px 24px; margin-bottom: 14px; }
  .theme-label { margin-bottom: 10px; font-size: 13px; color: #374151; }
  .theme-label .theme-id { font-size: 12px; color: #6b7280; }
</style>
<style>
${css}
</style>
</head>
<body>
  <div class="page">
    <p class="hint">
      静态核验页：样式取自 <code>src/styles/preview-themes.css</code>，
      内容由 <code>renderMarkdown()</code> 渲染（直接调用生产源码）。
      用于确认标题梯度、引用、嵌套列表、任务清单、高亮、表格、代码块的排版，
      以及底部代码块深浅色主题对比。
    </p>
    <div class="sheet">
      <div class="md-preview">${html}</div>
    </div>
    <h2 class="section">代码块主题对比（data-code-theme 切换）</h2>
    ${themeSheets}
  </div>
</body>
</html>
`,
  'utf8',
);

console.log(`written: ${outPath}`);
console.log(`css bytes: ${css.length}, html bytes: ${html.length}`);
