/** Evidence-only: find the element directly carrying authored text after Text projection. */
export function findDocumentFontSample(selector: string, chinese: boolean): HTMLElement | null {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) return null;
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    if (
      Array.from(element.childNodes).some((node) => {
        if (node.nodeType !== Node.TEXT_NODE) return false;
        const text = node.textContent ?? '';
        return chinese ? /[\u3400-\u9fff]/.test(text) : /[A-Za-z]/.test(text);
      })
    )
      return element;
  }
  return null;
}
