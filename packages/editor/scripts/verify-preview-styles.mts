/**
 * 预览排版样式断言：扫描 preview-themes.css 的关键文本，
 * 确认 list-style-type 显式覆盖、blockquote 多级差异化。
 *
 * 这些规则必须以文本形式出现，Tailwind v4 preflight 默认把 ol/ul
 * 设成 `list-style: none`，不显式声明就看不到 marker。
 *
 * 运行：npm run verify:preview-styles
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, '../src/styles/preview-themes.css');
const css = readFileSync(cssPath, 'utf8');

const must = (check: RegExp | boolean, label: string) => {
  const ok = typeof check === 'boolean' ? check : check.test(css);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  return ok;
};

const checks: [RegExp | boolean, string][] = [
  // —— 列表 marker 恢复（Tailwind v4 preflight 全局 list-style: none）——
  [/\.md-preview\s+ul\s*\{[^}]*list-style-type:\s*disc/, 'ul 显式 list-style-type: disc'],
  [/\.md-preview\s+ol\s*\{[^}]*list-style-type:\s*decimal/, 'ol 显式 list-style-type: decimal'],
  [/\.md-preview\s+ul\s+ul\s*\{[^}]*list-style-type:\s*circle/, '嵌套 ul → circle'],
  [/\.md-preview\s+ul\s+ul\s+ul\s*\{[^}]*list-style-type:\s*square/, '三层 ul → square'],
  [/\.md-preview\s+ol\s+ol\s*\{[^}]*list-style-type:\s*lower-alpha/, '嵌套 ol → lower-alpha'],
  [/\.md-preview\s+ul\s*,\s*\.md-preview\s+ol\s*\{[^}]*padding-left:/, 'ul/ol padding-left 写回（覆盖 preflight 清零）'],
  [/\.md-preview\s+li::marker\s*\{/, 'li::marker 颜色规则存在'],

  // —— 引用（default 用 .multiquote-N 类替代嵌套，与 markdown-nice basic 同构）——
  // 一级（multiquote-1）：边条+浅灰底，无 box-shadow（不是卡片，是分隔块）——避免嵌套卡片叠加。
  [/\.md-preview\[data-template="default"\]\s+\.multiquote-1[^\{]*\{[^}]*border-left:/, '一级左侧边条（multiquote-1，变量驱动）'],
  [/\.md-preview\[data-template="default"\]\s+\.multiquote-1[^\{]*\{[^}]*background:\s*var\(--pv-soft-bg/, '一级浅灰底（变量）'],
  [/\.md-preview\[data-template="default"\]\s+\.multiquote-2[^\{]*\{[^}]*border-left:\s*none/, '二级无左侧边条'],
  [/\.md-preview\[data-template="default"\]\s+\.multiquote-2[^\{]*\{[^}]*box-shadow:/, '二级白色阴影卡片'],
  [/\.md-preview\[data-template="default"\]\s+\.multiquote-3[^\{]*\{[^}]*text-align:\s*center/, '三级居中'],
  [/\.md-preview\[data-template="default"\]\s+blockquote\s+em[^\{]*\{[^}]*font-weight:\s*600/, '签名 em 加粗（对齐参考图）'],
  [/\.md-preview\[data-template="default"\]\s+blockquote\s+h3[^\{]*\{[^}]*border-left:\s*0/, '引用内标题去左侧边条'],
  // tech 模板保留嵌套选择器（兼容路径）
  [/\.md-preview\[data-template="tech"\]\s+blockquote\s+blockquote[^\{]*\{[^}]*border-left-width:\s*3px/, 'tech 二级边条变细到 3px'],
  [/\.md-preview\[data-template="tech"\]\s+blockquote\s+blockquote\s+blockquote[^\{]*\{[^}]*border-left:\s*1px/, 'tech 三级仅细边框 1px'],
  // 移植主题保留 multiquote 类
  [/\.multiquote-1\s*\{/, '移植主题保留 multiquote-1 类规则'],
  [/\.multiquote-2\s*\{/, '移植主题保留 multiquote-2 类规则'],
  [/\.multiquote-3\s*\{/, '移植主题保留 multiquote-3 类规则'],

  // —— 目录 nav.md-toc 样式 ——
  [/\.md-preview\s+nav\.md-toc\s*\{/, 'TOC 容器 base 规则存在'],
  [/\.md-preview\s+nav\.md-toc\s+ul\s*\{[^}]*list-style:\s*none/, 'TOC 内 ul 显式 list-style: none'],

  // —— 代码块主题（--code-* 变量驱动 + 多主题清单）——
  [/--code-bg:\s*var\(--pv-soft-bg\)/, '基础令牌含 --code-bg（默认=软底）'],
  [/--code-inline-bg:/, '基础令牌含 --code-inline-bg（行内 code 随主题）'],
  [/\.md-preview pre\s*\{[^}]*background:\s*var\(--code-bg\)/, 'pre 用 var(--code-bg)'],
  [/\.md-preview pre code\s*\{[^}]*color:\s*var\(--code-fg\)/, 'pre code 用 var(--code-fg)'],
  [/\.md-preview pre\[data-lang\]::before\s*\{[^}]*content:\s*attr\(data-lang\)/, 'pre[data-lang]::before 显示语言名'],
  [/\.md-preview\[data-code-theme="github-light"\]\s*\{[^}]*--code-bg:\s*#f6f8fa/, 'github-light 主题块'],
  [/\.md-preview\[data-code-theme="github-dark"\]\s*\{[^}]*--code-bg:\s*#0d1117/, 'github-dark 主题块'],
  [/\.md-preview\[data-code-theme="one-dark"\]\s*\{[^}]*--code-bg:\s*#282c34/, 'one-dark 主题块'],
  [/\.md-preview\[data-code-theme="dracula"\]\s*\{[^}]*--code-bg:\s*#282a36/, 'dracula 主题块'],
  [/\.md-preview\[data-code-theme="monokai"\]\s*\{[^}]*--code-bg:\s*#272822/, 'monokai 主题块'],
  [! /#22211d/.test(css), '无旧 dark 硬编码色残留（已迁移为变量）'],

  // —— 脚注（[^n] 语法）——
  [/\.md-preview\s+sup\.footnote-ref\s*\{/, '脚注引用上标规则存在'],
  [/\.md-preview\s+section\.footnotes\s*\{[^}]*font-size:\s*0\.86em/, '脚注区块规则存在'],
  [/\.md-preview\s+section\.footnotes\s+a\.footnote-backref\s*\{/, 'backref 回跳链接规则存在'],
];

let failed = 0;
for (const [re, label] of checks) {
  if (!must(re, label)) failed += 1;
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${checks.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
