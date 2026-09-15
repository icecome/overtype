/**
 * 草稿记忆：把编辑内容按防抖写入 localStorage，刷新或重开页面后自动恢复。
 *
 * 内核自带的 p0-cache 未从包入口导出，为避免改动 core 构建链路（需重建 dist
 * 且会触发 safe-delete 拦截），这里在 editor 侧复刻等价的自动记忆逻辑。
 * 仅依赖 getValue / setValue 两个访问器，与内核实现解耦。
 */
export interface DraftCache {
  /** 内容变化时调用，按 interval 防抖落盘 */
  onEdit: () => void;
  /** 立即写入一次 */
  save: () => void;
  /** 从 localStorage 恢复内容，返回恢复的文本或 null */
  restore: () => string | null;
  /** 删除 localStorage 草稿（不影响当前编辑内容） */
  clear: () => void;
  key: string;
}

export function createDraftCache(
  getValue: () => string,
  setValue: (value: string) => void,
  opts: { key?: string; interval?: number; restore?: boolean } = {}
): DraftCache {
  const key = opts.key ?? 'overtypeplus:editor';
  const interval = opts.interval ?? 800;
  const restore = opts.restore ?? true;
  let timer: number | null = null;

  const save = () => {
    try {
      localStorage.setItem(key, getValue());
    } catch {
      /* 存储不可用或超限：静默跳过，不阻塞编辑 */
    }
  };

  const onEdit = () => {
    if (timer !== null) clearTimeout(timer);
    timer = window.setTimeout(save, interval);
  };

  const restoreFn = (): string | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) {
        setValue(saved);
        return saved;
      }
    } catch {
      /* 读取失败：视为无草稿 */
    }
    return null;
  };

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 忽略 */
    }
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  if (restore) restoreFn();

  return { onEdit, save, restore: restoreFn, clear, key };
}
