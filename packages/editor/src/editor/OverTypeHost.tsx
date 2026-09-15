import { useCallback, useEffect, useMemo } from 'react';
import type { OverTypeInstance } from 'overtypeplus';
import { useOverType } from './useOverType';
import { createThrottledScheduler, extractOutline } from './bridge';
import { useEditorStore } from '../store/useEditorStore';
import { createDraftCache } from '../lib/draftCache';
import { registerEditor } from '../lib/scrollSync';

const SAMPLE = [
  '# OverTypePlus',
  '',
  '这是一个通过**透明覆盖层**实现所见即所得的 Markdown 编辑器。',
  '',
  '## 当前进度',
  '',
  '- 内核：packages/core（overtypeplus）',
  '- 前端：packages/editor（React + TS + Tailwind）',
  '- 桥接层：useOverType，StrictMode 安全',
  '',
  '## 已接入的壳层',
  '',
  '1. 顶栏与五域菜单',
  '2. 大纲侧栏',
  '3. 状态栏统计',
  '',
  '### 设计要点',
  '',
  '正文不进 React state，由内核持有；React 只消费派生状态。',
  '',
  '> 渲染层在下为范字，透明输入层在上覆盖。',
  '',
  '请开始输入。',
].join('\n');

/**
 * 内核挂载点，是全应用直接触碰内核 DOM 的收敛处。
 * 容器保持为空，内核自行管理内部 DOM 与样式。
 */
export function OverTypeHost() {
  const setInstance = useEditorStore((s) => s.setInstance);
  const setStats = useEditorStore((s) => s.setStats);
  const setOutline = useEditorStore((s) => s.setOutline);
  const setDraftCache = useEditorStore((s) => s.setDraftCache);
  const markDirty = useEditorStore((s) => s.markDirty);

  const scheduleStats = useMemo(() => createThrottledScheduler(200), []);
  const scheduleOutline = useMemo(() => createThrottledScheduler(150), []);

  const handleChange = useCallback(
    (_value: string, instance: OverTypeInstance) => {
      markDirty();
      scheduleStats(() => setStats(instance.getStats()));
      scheduleOutline(() => setOutline(extractOutline(instance.getSyntaxTree())));
      // 记忆：内容变化触发防抖落盘（读取最新缓存实例，避免闭包过期）
      useEditorStore.getState().draftCache?.onEdit();
    },
    [markDirty, scheduleStats, scheduleOutline, setStats, setOutline]
  );

  const { hostRef, instanceRef } = useOverType(
    { value: SAMPLE, toolbar: true },
    { onChange: handleChange }
  );

  // 实例就绪后写入 store 并初始化派生状态
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    setInstance(instance);
    setStats(instance.getStats());
    setOutline(extractOutline(instance.getSyntaxTree()));

    // 草稿记忆：按 key 自动存 localStorage，初始化时恢复上次内容
    const cache = createDraftCache(
      () => instance.getValue(),
      (value) => instance.setValue(value),
      { key: 'overtypeplus:editor', interval: 800, restore: true }
    );
    setDraftCache(cache);

    // 滚动同步：左侧编辑区（内核 textarea）作为滚动源之一
    registerEditor(instance.textarea ?? null);

    return () => {
      setInstance(null);
      registerEditor(null);
    };
  }, [instanceRef, setInstance, setStats, setOutline, setDraftCache]);

  return <div ref={hostRef} className="h-full" />;
}
