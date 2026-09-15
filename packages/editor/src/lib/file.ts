export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8'
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function pickTextFile(accept = '.md,.markdown,.txt'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      });
      reader.addEventListener('error', () => resolve(null));
      reader.readAsText(file);
    });
    input.click();
  });
}
