import type { OverTypeInstance } from 'overtypeplus';

/**
 * 编辑器内核配色：把内置 solar / cave 主题的暖色与彩色并进中性灰阶体系。
 *
 * 实现方式与原因：
 * 内核以行内样式把主题变量写在 instance.container 上——祖先元素的同名变量
 * 会被它盖掉，故需要在同一元素上覆盖。实例 setTheme() 运行时只接受主题名
 * 一个参数，每调用一次都会把主题变量重新追加到 container.style，因此本函数
 * 需要在 setTheme 之后调用。
 *
 * 取舍：标题层级用「墨色深浅」区分而非彩色；链接、语法标记与激活态保留应用
 * 主强调色（蓝）作为灰阶里唯一的彩色锚点，避免整片灰失去可读焦点。编辑区底
 * 色取浅灰（--bg-secondary），更耐看、适合长时间阅读。
 */
const EDITOR_VARS: Record<string, { light: string; dark: string }> = {
  // 表面与分隔
  '--bg-primary': { light: '#eef0f3', dark: '#1f242b' },
  '--bg-secondary': { light: '#f4f5f7', dark: '#232a33' }, // 编辑区阅读底色：浅灰
  '--hover-bg': { light: '#e5e7eb', dark: '#2b333d' },
  '--border': { light: '#d1d5db', dark: '#374151' },

  // 文字与层级（墨色深浅）
  '--text': { light: '#2b2f36', dark: '#e5e7eb' },
  '--text-primary': { light: '#2b2f36', dark: '#e5e7eb' },
  '--text-secondary': { light: '#6b7280', dark: '#9ca3af' },
  '--h1': { light: '#111827', dark: '#f9fafb' },
  '--h2': { light: '#1f2937', dark: '#e5e7eb' },
  '--h3': { light: '#374151', dark: '#cbd5e1' },
  '--strong': { light: '#111827', dark: '#f9fafb' },
  '--em': { light: '#374151', dark: '#cbd5e1' },
  '--del': { light: '#9ca3af', dark: '#9ca3af' },

  // 强调色：保留应用主蓝，作为灰阶里唯一彩色锚点
  '--link': { light: '#2563eb', dark: '#60a5fa' },
  '--primary': { light: '#2563eb', dark: '#60a5fa' },
  '--syntax-marker': { light: '#2563eb', dark: '#60a5fa' },
  '--cursor': { light: '#2563eb', dark: '#60a5fa' },
  '--selection': { light: 'rgba(37, 99, 235, 0.15)', dark: 'rgba(96, 165, 250, 0.20)' },

  // 代码与引用：灰阶，不再用那不勒斯黄
  '--code': { light: '#111827', dark: '#e5e7eb' },
  '--code-bg': { light: 'rgba(17, 24, 39, 0.06)', dark: 'rgba(229, 231, 235, 0.08)' },
  '--blockquote': { light: '#6b7280', dark: '#9ca3af' },
  '--hr': { light: '#9ca3af', dark: '#9ca3af' },
  '--syntax': { light: '#9ca3af', dark: '#6b7280' },
  '--list-marker': { light: '#6b7280', dark: '#9ca3af' },
  '--raw-line': { light: '#9ca3af', dark: '#9ca3af' },
  '--placeholder': { light: '#9ca3af', dark: '#6b7280' },

  // 工具栏：并入中性体系，激活态用主蓝
  '--toolbar-bg': { light: '#f4f5f7', dark: '#232a33' },
  '--toolbar-border': { light: '#d1d5db', dark: '#374151' },
  '--toolbar-icon': { light: '#374151', dark: '#e5e7eb' },
  '--toolbar-hover': { light: '#e5e7eb', dark: '#2b333d' },
  '--toolbar-active': { light: '#2563eb', dark: '#60a5fa' },
};

export function applyToolbarTheme(instance: OverTypeInstance | null, dark: boolean): void {
  if (!instance) return;

  for (const [name, value] of Object.entries(EDITOR_VARS)) {
    instance.container.style.setProperty(name, dark ? value.dark : value.light);
  }
}
