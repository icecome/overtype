/**
 * 预览栏 markdown 渲染器
 *
 * 内核的 MarkdownParser 为编辑器内联渲染设计（保留语法符号以维持字符对齐），
 * 输出非标准 HTML（`<span class="blockquote">` 而非 `<blockquote>`、`<li>` 无
 * `<ul>`/`<ol>` 包裹），与 preview-themes.css 的设计意图不符，故预览栏走
 * 独立的 marked 渲染。
 *
 * 使用 `new Marked()` 实例而非全局 `marked.use`——后者会污染模块作用域，
 * 对 HMR 与未来多份渲染入口（导出版本等）不友好。每次解析建一个独立实例，
 * 闭包注入只属于本次解析的 slug / headings 数据。
 *
 * 扩展项：
 *   - code renderer：`<pre>` 加 `class="code-block"`（已被 renderProfessional 钩子依赖）
 *   - listitem renderer：任务清单加 `class="task-list"`
 *   - heading renderer：从预扫描的 slug 列表取 id，便于 [TOC] 锚点跳转
 *   - toc 扩展：行首 `[TOC]` 渲染为嵌套标题列表（导航菜单）
 *   - highlight 扩展：==文本== → <mark>
 *
 * 不做 sanitize：预览栏与编辑器同源，渲染内容来自用户自己输入。
 *
 * 动态导入：marked 与 highlight.js 体积较大（hljs 注册 35+ 语言），
 * 改为按需 import() 只在预览栏挂载时加载，不进主包。
 */

import type {
  Renderer,
  Token,
  Tokens,
  TokenizerAndRendererExtension,
} from 'marked';
import type Hljs from 'highlight.js/lib/core';

interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * 中文友好 slug：英文转小写、空白/下划线转 `-`、连续分隔符合并、去首尾。
 * 中文按字保留（避免变成空 slug）。空串兜底 `heading`，与 GitHub 行为一致。
 */
function slugify(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'heading';
}

interface FootnoteDef {
  ref: string; // 原始标识（如 '1' / 'abc'）
  id: number;  // 按定义出现顺序的编号（1-based）
}

/**
 * 扫描 markdown 源收集标题与脚注定义（单次遍历）。
 * 排除 fenced code 块内的行，避免代码示例里的 `# heading` / `[^1]:` 被误识别。
 * 标题 slug 重复时按 GitHub 风格追加 `-1` / `-2` ...；
 * 脚注定义按出现顺序编号，供引用锚点与文末列表对应。
 */
function extractDocMeta(md: string): { headings: Heading[]; footnotes: FootnoteDef[] } {
  const lines = md.split(/\r?\n/);
  const headings: Heading[] = [];
  const footnotes: FootnoteDef[] = [];
  const seen = new Map<string, number>();
  let inFence = false;
  let fenceMarker = '';

  for (const line of lines) {
    const fenceMatch = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;

    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const baseId = slugify(text);
      const n = seen.get(baseId) ?? 0;
      const id = n === 0 ? baseId : `${baseId}-${n}`;
      seen.set(baseId, n + 1);
      headings.push({ level, text, id });
    }

    const f = /^\[\^([^\]]+)\]:\s*/.exec(line);
    if (f) {
      footnotes.push({ ref: f[1], id: footnotes.length + 1 });
    }
  }
  return { headings, footnotes };
}

/**
 * TOC 扩展：行首 `[TOC]` / `[toc]` 渲染为嵌套标题列表。
 * 输入的 headings 已按出现顺序保留，level 差通过嵌套 ul 表达。
 */
function makeTocExtension(headings: Heading[]): TokenizerAndRendererExtension {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  return {
    name: 'toc',
    level: 'block',
    start(src) {
      // 启发表：标注 src 中第一个 [TOC] 行位置，让 lexer 别跳过它。
      // 用了 m flag 因为 src 可能以多行文本开头，要找任一行的 [TOC]。
      // 关键限制在 tokenizer，必须严格 ^ 匹配 src 头部（不带 m）。
      const m = /^[ \t]*\[TOC\][ \t]*$/m.exec(src);
      return m ? m.index : undefined;
    },
    tokenizer(src) {
      // 严格匹配 src 起始位置（无 m flag），避免误捕 heading 内部等位置。
      // raw 含换行符，让 lexer 整行消耗（含其后 \n），避免与下一行粘连。
      const m = /^[ \t]*\[TOC\][ \t]*\n?/.exec(src);
      if (!m) return undefined;
      return {
        type: 'toc',
        raw: m[0],
      };
    },
    renderer() {
      if (!headings.length) {
        return '<p class="md-toc-empty">文档无标题，无法生成目录。</p>\n';
      }
      const minLevel = Math.min(...headings.map((h) => h.level));
      const lines: string[] = ['<nav class="md-toc" aria-label="目录"><ul>'];
      let opened = 0;
      for (const h of headings) {
        const lvl = h.level - minLevel + 1;
        while (opened < lvl) {
          lines.push('<li><ul>');
          opened++;
        }
        while (opened > lvl) {
          lines.push('</ul></li>');
          opened--;
        }
        lines.push(
          `<li><a href="#${escape(h.id)}" data-toc-link>${escape(h.text)}</a></li>`,
        );
      }
      while (opened > 0) {
        lines.push('</ul></li>');
        opened--;
      }
      lines.push('</ul></nav>');
      return lines.join('\n') + '\n';
    },
  };
}

/**
 * 脚注扩展：`[^n]` 引用 → 上标链接；`[^n]: 内容` 定义行 → 渲染时收集
 * 到闭包数组，经 postprocess 钩子在文末追加 <section class="footnotes">。
 *
 * 与 TOC 相同纪律：tokenizer 严格匹配 src 头部（无 m flag）。
 * 未定义的引用让 tokenizer 返回 undefined，回退默认解析保留字面。
 */
function makeFootnoteExtensions(defs: FootnoteDef[]) {
  const lookup = new Map(defs.map((d) => [d.ref, d.id]));
  const defHtml: string[] = [];

  const refExtension: TokenizerAndRendererExtension = {
    name: 'footnote-ref',
    level: 'inline',
    start(src) {
      return src.search(/\[\^[^\]]+\]/);
    },
    tokenizer(src) {
      const m = /^\[\^([^\]]+)\]/.exec(src);
      if (!m) return undefined;
      const id = lookup.get(m[1]);
      if (!id) return undefined;
      return { type: 'footnote-ref', raw: m[0], id };
    },
    renderer(token) {
      const { id } = token as Tokens.Generic & { id: number };
      return `<sup class="footnote-ref"><a href="#fn-${id}" id="fnref-${id}">${id}</a></sup>`;
    },
  };

  const defExtension: TokenizerAndRendererExtension = {
    name: 'footnote-def',
    level: 'block',
    start(src) {
      return src.search(/^\[\^[^\]]+\]:\s/m);
    },
    tokenizer(src) {
      const m = /^\[\^([^\]]+)\]:\s*(.*)\n?/.exec(src);
      if (!m) return undefined;
      const id = lookup.get(m[1]);
      if (!id) return undefined;
      return {
        type: 'footnote-def',
        raw: m[0],
        id,
        tokens: this.lexer.inlineTokens(m[2]),
      };
    },
    renderer(token) {
      const t = token as Tokens.Generic & { id: number; tokens: Tokens.Generic[] };
      defHtml[t.id - 1] =
        `<li id="fn-${t.id}"><p>${this.parser.parseInline(t.tokens)} ` +
        `<a href="#fnref-${t.id}" class="footnote-backref" aria-label="返回正文">&#8617;</a></p></li>`;
      return '';
    },
  };

  return {
    extensions: [refExtension, defExtension],
    hooks: {
      postprocess(html: string): string {
        const list = defHtml.filter(Boolean).join('');
        if (!list) return html;
        return `${html}<section class="footnotes"><hr class="footnotes-rule"><ol>${list}</ol></section>\n`;
      },
    },
  };
}

/**
 * 给标题加 id：按 token 解析顺序与 headings 数组一一对应，
 * 因为预扫描与 marked 解析对 ATX 标题的识别规则相同（行首 #）。
 *
 * 标题拆成 prefix / content / suffix 三段：移植的 markdown-nice 主题用
 * `.content` 承载文字（渐变背景、圆角等装饰）、`.prefix` / `.suffix` 承载
 * 装饰伪元素（方块、引号等）。marked 默认只输出纯文本，缺这两段会让
 * 移植主题的标题装饰全部失效。prefix / suffix 在 markdown 源中无对应内容
 * （`#` 已被解析器剥离），故输出空 span 供 CSS 装饰。
 */
function makeHeadingRenderer(headings: Heading[]) {
  let idx = 0;
  const escape = (s: string) => s.replace(/"/g, '&quot;');
  return function (this: Renderer, { tokens, depth, text }: Tokens.Heading): string {
    const entry = headings[idx++];
    const idAttr = entry && entry.text === text ? ` id="${escape(entry.id)}"` : '';
    const inner = this.parser.parseInline(tokens);
    return `<h${depth}${idAttr}><span class="prefix"></span><span class="content">${inner}</span><span class="suffix"></span></h${depth}>\n`;
  };
}

/**
 * 给每个 blockquote token 标记嵌套深度（根=1，内层逐级 +1），
 * renderer 据此输出 multiquote-N 类。
 *
 * 语义对齐用户规格（也是 markdown 直觉）：
 *   `> 一级`   → multiquote-1（边条 + 浅灰底 + 左对齐）
 *   `> > 二级` → multiquote-2（阴影边框 + 白底 + 左对齐）
 *   `> > > 三级` → multiquote-3（阴影边框 + 白底 + 居中）
 * （根=1 递增，而非"根=最大深度"——后者的类分配会让一级内容落在
 *   最大深度容器上，视觉变成白底边框而非浅灰边条）
 */
function tagQuoteDepth(tokens: Token[]): void {
  const walk = (ts: Token[], depth: number) => {
    for (const t of ts) {
      if (t.type === 'blockquote') {
        (t as Tokens.Blockquote & { quoteDepth?: number }).quoteDepth = depth;
        walk((t as Tokens.Blockquote).tokens, depth + 1);
      }
    }
  };
  walk(tokens, 1);
}

function blockquoteRenderer(this: Renderer, token: Tokens.Blockquote): string {
  const depth = (token as Tokens.Blockquote & { quoteDepth?: number }).quoteDepth ?? 1;
  return `<blockquote class="multiquote-${depth}">${this.parser.parse(token.tokens)}</blockquote>\n`;
}

/**
 * 延迟初始化的 hljs 单例：只在第一次 renderMarkdown 调用时动态 import，
 * 避免 highlight.js + 35 语言注册进编辑器主包。
 */
let hljsPromise: Promise<typeof import('highlight.js/lib/core')['default']> | null = null;

async function getHljs() {
  if (!hljsPromise) {
    hljsPromise = import('highlight.js/lib/core').then(async (mod) => {
      const hljs = mod.default;
      // 副作用注册 35+ 常用语言到 hljs 单例
      await import('highlight.js/lib/common');
      return hljs;
    });
  }
  return hljsPromise;
}

function codeRendererFactory(hljs: typeof Hljs) {
  return function codeRenderer(this: Renderer, { text, lang }: Tokens.Code): string {
    const langClass = lang ? ` class="language-${lang}"` : '';
    const langAttr = lang ? ` data-lang="${lang}"` : '';
    let highlighted: string;
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value;
    } else {
      highlighted = text;
    }
    return `<pre class="code-block"${langAttr}><code${langClass}>${highlighted}</code></pre>\n`;
  };
}

/**
 * 委托默认实现：默认 listitem 走 parser.parse（block 级），才能正确处理嵌套列表。
 * `parser.parseInline` 只处理 inline token，遇到嵌套列表的 block 级 list token
 * 会抛 `Token with "list" type was not found`。
 */
function listitemRenderer(this: Renderer, item: Tokens.ListItem): string {
  const html = this.parser.parse([item]);
  return item.task ? html.replace(/^<li>/, '<li class="task-list">') : html;
}

/**
 * 高亮 `==文本==` 扩展。
 *
 * 工具栏「更多」面板可插入该语法，而 GFM 与内核 parser 均未覆盖，
 * 缺此扩展时预览会回退成原始 `==` 符号。
 *
 * tokenizer 内用 this.lexer.inlineTokens 生成子 token，才能正确处理
 * `==**粗体**==` 这类嵌套；renderer 侧再用 parser.parseInline 还原。
 */
const highlightExtension: TokenizerAndRendererExtension = {
  name: 'highlight',
  level: 'inline',
  start(src) {
    const index = src.indexOf('==');
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    // 首尾 (?!\s) / (?<!\s) 排除 `a == b == c` 这类等式，降低误判
    const match = /^==(?!\s)([^=\n]+?)(?<!\s)==/.exec(src);
    if (!match) return undefined;
    const text = match[1];
    return {
      type: 'highlight',
      raw: match[0],
      text,
      tokens: this.lexer.inlineTokens(text),
    };
  },
  renderer(token) {
    const t = token as Tokens.Generic & { tokens: Tokens.Generic[] };
    return `<mark>${this.parser.parseInline(t.tokens ?? [])}</mark>`;
  },
};

/**
 * 渲染 markdown 为标准 HTML 字符串。
 *
 * 每次调用都新建 Marked 实例：闭包注入只属于本次解析的 slug / headings，
 * 避免全局 `marked.use` 的污染（对 HMR 与未来多份入口更友好）。
 *
 * 改为 async：marked 与 highlight.js 通过动态 import 加载，不进主包。
 * 首次调用有加载延迟，后续走缓存。
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const [{ Marked }, hljs] = await Promise.all([
    import('marked'),
    getHljs(),
  ]);
  const { headings, footnotes } = extractDocMeta(markdown);
  const footnote = makeFootnoteExtensions(footnotes);
  const marked = new Marked({
    renderer: {
      code: codeRendererFactory(hljs),
      listitem: listitemRenderer,
      heading: makeHeadingRenderer(headings),
      blockquote: blockquoteRenderer,
    },
    extensions: [highlightExtension, makeTocExtension(headings), ...footnote.extensions],
    hooks: footnote.hooks,
  });
  const tokens = marked.lexer(markdown);
  tagQuoteDepth(tokens);
  let html = marked.parser(tokens);
  if (footnote.hooks?.postprocess) {
    html = footnote.hooks.postprocess(html);
  }
  return html;
}
