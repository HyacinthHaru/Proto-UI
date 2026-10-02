/** Website consumer identity. Runtime/adapter choice is a separate axis. */
export type SiteLibraryFamily = 'shadcn' | 'brutalist';

/** Library routes own the document family; Base and editorial routes use the site default. */
export function resolveSiteLibraryFamily(pathname: string): SiteLibraryFamily {
  return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?ui-libraries\/brutalist(?:\/|$)/i.test(pathname)
    ? 'brutalist'
    : 'shadcn';
}

export function siteControlTags(family: SiteLibraryFamily) {
  return {
    Button: `wc-${family}-button`,
    SelectRoot: `wc-${family}-select-root`,
    SelectTrigger: `wc-${family}-select-trigger`,
    SelectValue: `wc-${family}-select-value`,
    SelectContent: `wc-${family}-select-content`,
    SelectItem: `wc-${family}-select-item`,
  } as const;
}

/** Call only at the active page scope's successful projection commit. */
export function applySiteLibraryFamily(doc: Document, family: SiteLibraryFamily): void {
  doc.documentElement.dataset.siteLibraryFamily = family;
  // The SSR marker supports no-script rendering and must follow client commits.
  doc.querySelectorAll<HTMLElement>('[data-site-family-scope]').forEach((scope) => {
    scope.dataset.siteLibraryFamily = family;
  });
}
