import { useEffect, useRef } from 'react';
import OverType from 'overtypeplus';
import type { Options, OverTypeInstance } from 'overtypeplus';

export interface OverTypeHandlers {
  onChange?: (value: string, instance: OverTypeInstance) => void;
}

export interface UseOverTypeResult {
  hostRef: React.RefObject<HTMLDivElement | null>;
  instanceRef: React.MutableRefObject<OverTypeInstance | null>;
}

/**
 * 挂载内核实例。选项在首次挂载时冻结，避免内联对象导致实例反复重建。
 * StrictMode 下 effect 会执行两次，cleanup 需要销毁实例，否则残留第二个预览层。
 */
export function useOverType(
  options: Options = {},
  handlers: OverTypeHandlers = {}
): UseOverTypeResult {
  const hostRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<OverTypeInstance | null>(null);
  const optionsRef = useRef(options);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const [instance] = new OverType(host, {
      ...optionsRef.current,
      onChange: (value: string, inst: OverTypeInstance) => {
        handlersRef.current.onChange?.(value, inst);
      },
    });
    instanceRef.current = instance;

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  return { hostRef, instanceRef };
}
