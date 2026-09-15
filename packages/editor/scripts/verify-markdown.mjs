/**
 * 校验预览栏 markdown 渲染输出的结构是否符合 preview-themes.css 的期望。
 *
 * 直接 import 生产源码（依赖 Node 22 的 --experimental-strip-types），
 * 避免脚本与源码各存一份 renderer 副本、导致"验证通过但线上不一致"。
 *
 * 运行：npm run verify:markdown
 */
import { renderMarkdown } from '../src/lib/markdown-renderer.ts';

const md = [
  '# 一级标题',
  '',
  '## 二级标题',
  '',
  '> 一级引用',
  '>',
  '> > 嵌套二级引用',
  '>',
  '> > > 三级嵌套引用',
  '',
  '- 无序项一',
  '  - 嵌套项',
  '- 无序项二',
  '',
  '1. 有序项一',
  '2. 有序项二',
  '',
  '- [ ] 未完成任务',
  '- [x] 已完成任务',
  '',
  '**粗体** *斜体* ~~删除线~~ `行内代码` ==高亮文本==',
  '',
  '==**粗体高亮**==',
  '',
  '| 列A | 列B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '```js',
  'const a = 1;',
  '```',
  '',
  '---',
  '',
  '正文段落[链接](https://example.com)。',
].join('\n');

const html = renderMarkdown(md);

// —— TOC + heading id 用独立的样张，原样张无 [TOC] 占位符 ——
const tocMd = [
  '# 总览',
  '',
  '## 章节 A',
  '',
  '[TOC]',
  '',
  '## 章节 B',
  '',
  '### 子节 B1',
  '',
  '# 总览',
  '',
  '代码块内 `# 不算标题`：',
  '',
  '```',
  '# 这也不是标题',
  '```',
].join('\n');
const tocHtml = renderMarkdown(tocMd);

const checks = [
  ['h1', /<h1[^>]*><span class="prefix"><\/span><span class="content">一级标题<\/span>/],
  ['h2', /<h2[^>]*><span class="prefix"><\/span><span class="content">二级标题<\/span>/],
  ['标题三段结构（移植主题装饰位）', /<span class="prefix"><\/span><span class="content">一级标题<\/span><span class="suffix"><\/span>/],
  ['blockquote', /<blockquote class="multiquote-1">/],
  ['二级引用 multiquote-2', /<blockquote class="multiquote-2">/],
  ['三级引用 multiquote-3', /<blockquote class="multiquote-2"><blockquote class="multiquote-3">/],
  ['ul 包裹 li', /<ul>\s*<li>无序项一/],
  ['嵌套 ul', /<li>无序项一<ul>\s*<li>嵌套项<\/li>/],
  ['ol 包裹 li', /<ol>\s*<li>有序项一<\/li>/],
  ['task-list class', /<li class="task-list">/],
  ['checkbox 未选中', /<input disabled="" type="checkbox"> 未完成任务/],
  ['checkbox 已选中', /<input checked="" disabled="" type="checkbox"> 已完成任务/],
  ['strong', /<strong>粗体<\/strong>/],
  ['em', /<em>斜体<\/em>/],
  ['del（GFM 删除线）', /<del>删除线<\/del>/],
  ['inline code', /<code>行内代码<\/code>/],
  ['highlight（==文本==）', /<mark>高亮文本<\/mark>/],
  ['highlight 嵌套粗体', /<mark><strong>粗体高亮<\/strong><\/mark>/],
  ['table', /<table>/],
  ['table thead', /<thead>/],
  ['table th', /<th>列A<\/th>/],
  ['pre.code-block', /<pre class="code-block"/],
  ['pre data-lang 语言名', /<pre class="code-block" data-lang="js">/],
  ['code language class', /<code class="language-js">/],
  ['hljs keyword 高亮（const）', /<span class="hljs-keyword">const<\/span>/],
  ['hljs number 高亮', /<span class="hljs-number">1<\/span>/],
  ['hljs 支持 js alias（hljs.getLanguage 通过）', /hljs-keyword/],
  ['hr', /<hr>/],
  ['a', /<a href="https:\/\/example\.com">链接<\/a>/],
];

// —— TOC 单独一组，在 tocHtml 上跑 ——
/** @type {Array<[string, RegExp | boolean]>} */
const tocChecks = [
  ['TOC 渲染为 nav.md-toc', /<nav class="md-toc"[^>]*>/],
  ['TOC 嵌套 ul 表达层级差', /<nav class="md-toc"[^>]*>[\s\S]*<li><ul>[\s\S]*<\/ul><\/li>[\s\S]*<\/nav>/],
  ['TOC 链接带锚点 + data-toc-link', /<a href="#[^"]+" data-toc-link>/],
  ['heading 一级有 id', /<h1 id="总览">/],
  ['heading 嵌套二级有 id', /<h2 id="[^"]+">[\s\S]*?章节 A/],
  ['重复 slug 自动追加 -1', /<h1 id="总览-1">/],
  ['代码块内 # 不算标题（不是 <hN>）', !/<h[1-6][^>]*>[^<]*这也不是标题/.test(tocHtml)],
  ['md-toc 容器恰好一个', (tocHtml.match(/md-toc/g) || []).length === 1],
];

// 等式中的裸 == 不应被高亮扩展吃掉
const eqHtml = renderMarkdown('等式 a == b == c 不应高亮');

// —— 脚注单独一组：引用上标 + 文末列表 + 边界情况 ——
const fnMd = [
  '正文引用脚注[^1]与第二个[^2]。',
  '',
  '[^1]: 第一条脚注内容。',
  '',
  '[^2]: 第二条含 [链接](https://example.com)。',
  '',
  '未定义引用[^99]保持字面。',
  '',
  '```',
  '[^3]: 代码块内的定义不算脚注',
  '```',
].join('\n');
const fnHtml = renderMarkdown(fnMd);

/** @type {Array<[string, RegExp | boolean]>} */
const fnChecks = [
  ['脚注引用渲染上标链接', /<sup class="footnote-ref"><a href="#fn-1"[^>]*>1<\/a><\/sup>/],
  ['脚注定义收集到文末列表', /<section class="footnotes">[\s\S]*<li id="fn-1">/],
  ['脚注内容 inline 渲染（链接）', /<li id="fn-2"><p>第二条含 <a href="https:\/\/example\.com">链接<\/a>/],
  ['backref 回跳链接存在', /class="footnote-backref"/],
  ['未定义引用保留字面', /未定义引用\[\^99\]保持字面/],
  ['代码块内定义不算脚注', !/<li id="fn-3">/.test(fnHtml)],
  ['footnotes 区块恰好一个', (fnHtml.match(/section class="footnotes"/g) || []).length === 1],
];

const regressions = [
  ['等式 a == b == c 未被误判为高亮', !eqHtml.includes('<mark>')],
  ['无 span.blockquote 残留', !/span class="blockquote"/.test(html)],
  ['无 syntax-marker 残留', !/syntax-marker/.test(html)],
  ['无裸 li（li 无 ul/ol 父级）', !/(^|<\/(ul|ol)>)\s*<li>/.test(html.replace(/<ul>[\s\S]*?<\/ul>|<ol>[\s\S]*?<\/ol>/g, ''))],
  ['hljs 不支持的 lang 回退纯文本', !/<span class="hljs/.test(renderMarkdown('```foo\nbar\n```'))],
];

let failed = 0;
for (const [name, re] of checks) {
  const ok = re.test(html);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}
for (const [name, check] of tocChecks) {
  const ok = typeof check === 'boolean' ? check : check.test(tocHtml);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}
for (const [name, check] of fnChecks) {
  const ok = typeof check === 'boolean' ? check : check.test(fnHtml);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}
for (const [name, ok] of regressions) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

const total = checks.length + tocChecks.length + fnChecks.length + regressions.length;
console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${total} checks)`);
process.exit(failed === 0 ? 0 : 1);
