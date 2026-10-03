// Preserve plugin-frames 0.41.7's post-preprocessing payload policy. Highlighted
// DOM is never a source of truth, and no hidden inherited Copy handler survives.
export function expressiveCodeCopyText(code, terminal) {
  return terminal ? code.replace(/(?<=^|\n)\s*#.*($|\n+)/g, '').trim() : code;
}

export function siteCopyPlugin() {
  return {
    name: 'Website Copy command',
    hooks: {
      postprocessRenderedBlock({ codeBlock, renderData, locale }) {
        const frame = renderData.blockAst;
        if (frame.tagName !== 'figure')
          throw new Error('Website Copy requires the EC frames wrapper');
        const classes = frame.properties.className ?? [];
        const terminal = classes.includes('is-terminal');
        const label = locale.toLowerCase().startsWith('zh') ? '复制代码' : 'Copy code';
        frame.children.push({
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['site-ec-copy'],
            'data-site-copy': '',
            'data-copy-label': label,
            'data-site-copy-text': expressiveCodeCopyText(codeBlock.code, terminal),
          },
          children: [],
        });
      },
    },
  };
}
