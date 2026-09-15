import { create } from 'zustand';
import type { OverTypeInstance, Stats } from 'overtypeplus';
import type { DraftCache } from '../lib/draftCache';

export interface OutlineItem {
  line: number;
  level: number;
  text: string;
}

export type ViewMode = 'normal' | 'ir' | 'preview' | 'plain';

/** 预览栏呈现的视口。仅影响预览区宽度，不改变解析结果 */
export type PreviewDevice = 'desktop' | 'mobile';

/**
 * 编辑器派生状态。正文由内核持有，不进 store——
 * 每次按键都写 React 状态会让长文档的协调成本随内容增长。
 */
interface EditorStore {
  /** 内核实例引用，挂载后写入一次，供菜单与侧栏调用命令式 API */
  instance: OverTypeInstance | null;
  stats: Stats | null;
  outline: OutlineItem[];
  mode: ViewMode;
  immersive: boolean;
  sidebarOpen: boolean;
  /** 双栏（编辑 + 样式预览）开关 */
  splitView: boolean;
  /** 编辑区在双栏中的宽度占比，0–1 */
  splitRatio: number;
  /** 排版模板 id，见 domains/theme/templates.ts */
  previewTemplate: string;
  /** 代码块配色 id */
  codeTheme: string;
  /** 预览视口：桌面 / 移动 */
  previewDevice: PreviewDevice;
  /** 用户自定义 CSS，仅作用于预览栏 */
  customCss: string;
  /** 明暗。切换只改 CSS 变量，组件本身不因明暗重渲染 */
  dark: boolean;
  savedAt: number | null;
  dirty: boolean;
  /** 草稿记忆实例，挂载后写入；菜单据此恢复/清除本地草稿 */
  draftCache: DraftCache | null;

  setInstance: (instance: OverTypeInstance | null) => void;
  setDraftCache: (cache: DraftCache | null) => void;
  setStats: (stats: Stats) => void;
  setOutline: (outline: OutlineItem[]) => void;
  setMode: (mode: ViewMode) => void;
  toggleImmersive: () => void;
  toggleSidebar: () => void;
  toggleSplitView: () => void;
  setSplitRatio: (ratio: number) => void;
  setPreviewTemplate: (id: string) => void;
  setCodeTheme: (id: string) => void;
  setPreviewDevice: (device: PreviewDevice) => void;
  setCustomCss: (css: string) => void;
  toggleDark: () => void;
  markSaved: (at: number) => void;
  markDirty: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  instance: null,
  stats: null,
  outline: [],
  mode: 'normal',
  immersive: false,
  sidebarOpen: false,
  splitView: true,
  splitRatio: 0.5,
  previewTemplate: 'default',
  codeTheme: 'light',
  previewDevice: 'desktop',
  customCss: '',
  dark: false,
  savedAt: null,
  dirty: false,
  draftCache: null,

  setInstance: (instance) => set({ instance }),
  setDraftCache: (cache) => set({ draftCache: cache }),
  setStats: (stats) => set({ stats }),
  setOutline: (outline) => set({ outline }),
  setMode: (mode) => set({ mode }),
  toggleImmersive: () => set((s) => ({ immersive: !s.immersive })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSplitView: () => set((s) => ({ splitView: !s.splitView })),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  setPreviewTemplate: (id) => set({ previewTemplate: id }),
  setCodeTheme: (id) => set({ codeTheme: id }),
  setPreviewDevice: (device) => set({ previewDevice: device }),
  setCustomCss: (css) => set({ customCss: css }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),
  markSaved: (at) => set({ savedAt: at, dirty: false }),
  markDirty: () => set({ dirty: true }),
}));
