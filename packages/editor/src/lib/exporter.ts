import previewThemesCss from '../styles/preview-themes.css?raw';

export interface StyledExportOptions {
  title: string;
  /** 已渲染的正文 HTML，通常来自 getRenderedHTML({ cleanHTML: true }) */
  bodyHtml: string;
  /** 排版模板 id */
  template: string;
  /** 代码块配色 id */
  codeTheme: string;
  /** 用户自定义 CSS */
  customCss: string;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * 导出套用当前排版模板的 HTML。
 *
 * 与预览栏共用同一份模板 CSS、同样的 data-* 属性与自定义 CSS 包裹方式，
 * 以保证「预览栏所见」与「导出所得」一致。
 * 标题与属性值做转义：正文来自用户内容，不应成为注入点。
 */
export function exportStyledHTML(options: StyledExportOptions): string {
  const { title, bodyHtml, template, codeTheme, customCss } = options;

  const scopeStyle = customCss.trim()
    ? `\n<style>@scope (.md-preview) { ${customCss} }</style>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${previewThemesCss}</style>${scopeStyle}
</head>
<body>
<div class="md-preview" data-template="${escapeHtml(template)}" data-code-theme="${escapeHtml(codeTheme)}">
${bodyHtml}
</div>
</body>
</html>`;
}
