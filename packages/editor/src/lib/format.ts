import type { OverTypeInstance } from 'overtypeplus';

/**
 * 经内核 performAction 派发格式化动作。
 *
 * 直接用它而非自行调用 markdownActions，是因为 performAction 会先聚焦 textarea
 * 再执行——顶部下拉菜单点击会先让 textarea 失焦，自行调用容易丢掉选区。
 * actionId 取自内核 builtin 按钮名（bold / h1 / bulletList / clearFormat 等），
 * 内核对未知 id 会告警并返回 false。
 */
export function runFormatAction(instance: OverTypeInstance | null, actionId: string): void {
  if (!instance) return;

  instance.performAction(actionId, null).catch((error: unknown) => {
    console.error(`格式动作 ${actionId} 执行失败`, error);
  });
}
