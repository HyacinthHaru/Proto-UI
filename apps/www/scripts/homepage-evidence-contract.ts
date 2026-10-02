export const HOMEPAGE_BASELINE = '1fd4c08a067a8322295c78b2b708d2b4cbc01304';
export const HOMEPAGE_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
] as const;
export const HOMEPAGE_ROUTES = ['/zh-cn/', '/en/'] as const;
export const DOCUMENTATION_VARIANTS = [
  { id: 'base-toggle', family: 'base', route: '/zh-cn/ui-libraries/base/toggle/' },
  { id: 'shadcn-radio-group', family: 'shadcn', route: '/zh-cn/ui-libraries/shadcn/radio-group/' },
  {
    id: 'brutalist-tooltip',
    family: 'brutalist',
    route: '/zh-cn/ui-libraries/brutalist/components/tooltip/',
  },
] as const;

export function verifyRevision(actual: string, expected: string, status: string): void {
  if (!/^[a-f0-9]{40}$/.test(expected))
    throw new Error('Expected revision must be a full Git SHA.');
  if (actual !== expected)
    throw new Error(`Revision mismatch: expected ${expected}, got ${actual}.`);
  if (status.trim())
    throw new Error('Evidence requires a clean source worktree before server startup.');
}

export function layoutFailures(
  metrics: {
    viewportWidth: number;
    documentWidth: number;
    bodyWidth: number;
    fonts: Array<{ name: string; fontFamily: string }>;
  },
  { requireSansSerif = true } = {}
): string[] {
  const failures: string[] = [];
  if (Math.max(metrics.documentWidth, metrics.bodyWidth) > metrics.viewportWidth + 1) {
    failures.push(
      `Horizontal overflow: ${Math.max(metrics.documentWidth, metrics.bodyWidth)} > ${metrics.viewportWidth}`
    );
  }
  if (!metrics.fonts.some((font) => font.name === 'heading'))
    failures.push('Missing heading font sample.');
  for (const font of metrics.fonts) {
    if (requireSansSerif && !/(?:sans-serif|system-ui)/i.test(font.fontFamily)) {
      failures.push(`${font.name} does not inherit a sans-serif stack: ${font.fontFamily}`);
    }
  }
  return failures;
}
