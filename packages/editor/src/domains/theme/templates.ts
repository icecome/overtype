export interface PreviewTemplate {
  id: string;
  label: string;
  hint: string;
}

/**
 * 排版模板清单。
 * 样式定义见 src/styles/preview-themes.css，新增模板需同步两处（id 对应 data-template）。
 * 前 4 项为自有模板（变量驱动），后 10 项移植自 markdown-nice fork
 * （nicejade/markdown-nice 的 src/component/MenuLeft/ThemeConf.js），
 * 以 @scope 形式限定在 .md-preview[data-template="<id>"] 内，互不干扰。
 */
export const PREVIEW_TEMPLATES: PreviewTemplate[] = [
  { id: 'default', label: '宣纸默认', hint: '衬线 / 朱砂强调' },
  { id: 'wechat', label: '公众号', hint: '无衬线 / 宽松行距' },
  { id: 'tech', label: '技术博客', hint: '墨与信号绿 / 紧凑' },
  { id: 'minimal', label: '简素', hint: '极简 / 细线分隔' },

  // 移植主题（markdown-nice）
  { id: 'chuizi', label: '锤子便签', hint: '米黄底 / 棕灰字' },
  { id: 'yanqihu', label: '雁栖湖', hint: '青绿点缀 / 学术风' },
  { id: 'wechat-format', label: 'WeChat-Format', hint: '橙红标题 / 微信排版' },
  { id: 'jijianhei', label: '极简黑', hint: '黑白极简 / 无修饰' },
  { id: 'shanchui', label: '山吹', hint: '金黄点缀 / 渐变标题' },
  { id: 'hongfei', label: '红绯', hint: '朱红主调 / 圆润' },
  { id: 'lvyi', label: '绿意', hint: '青绿主调 / 清新' },
  { id: 'nenqing', label: '嫩青', hint: '淡雅青灰 / 素净' },
  { id: 'chazi', label: '姹紫', hint: '紫调 / 雅致' },
  { id: 'chengxin', label: '橙心', hint: '浅米暖调 / 柔和' },
];

export interface CodeBlockTheme {
  id: string;
  label: string;
  hint: string;
}

/**
 * 代码块配色主题。仅覆盖 CSS 变量（--code-*），不引入外部高亮库主题。
 * id 对应 preview-themes.css 的 data-code-theme 选择器，新增主题需同步两处。
 */
export const CODE_BLOCK_THEMES: CodeBlockTheme[] = [
  { id: 'light', label: '浅色块', hint: '默认浅灰' },
  { id: 'github-light', label: 'GitHub 浅色', hint: '浅灰底 / 墨字' },
  { id: 'github-dark', label: 'GitHub 深色', hint: '近黑底 / 亮字' },
  { id: 'one-dark', label: 'One Dark', hint: '深蓝灰底' },
  { id: 'dracula', label: 'Dracula', hint: '深紫底' },
  { id: 'monokai', label: 'Monokai', hint: '深棕底' },
];
