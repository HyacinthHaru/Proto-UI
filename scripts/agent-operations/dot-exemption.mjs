// An owner-authorized role disclosure, deliberately not a ModelTrace receipt.
// This module neither samples a model nor grants repository/action permission.
export const DOT_EXEMPTION = 'owner-authorized-2026-10-06';
export const DOT_DISCLOSURE = [
  'Agent: dot',
  'ModelTrace: not measured — owner-authorized dot exemption (2026-10-06)',
  'This role declaration is not authenticated model identity, permission, independent review, or acceptance.',
].join('\n');

export function isDotExemption(args) {
  const agent = args.get('--agent');
  const exemption = args.get('--dot-exemption');
  if (agent === undefined && exemption === undefined) return false;
  if (agent !== 'dot' || exemption !== DOT_EXEMPTION)
    throw new Error('dot exemption requires --agent dot and the exact owner-authorized exemption');
  if (args.has('--record') || args.has('--context'))
    throw new Error('dot exemption must not be combined with a ModelTrace record or context');
  return true;
}

export function hasDotDisclosure(text, format = 'markdown') {
  if (typeof text !== 'string') throw new Error('dot disclosure requires text');
  const agents = text.split(/\r?\n/).filter((line) => /^Agent:/i.test(line));
  const traces = text.split(/\r?\n/).filter((line) => /^ModelTrace:/i.test(line));
  if (agents.length === 0 && traces.length === 0) return false;
  if (
    agents.length !== 1 ||
    agents[0] !== 'Agent: dot' ||
    traces.length !== 1 ||
    traces[0] !== DOT_DISCLOSURE.split('\n')[1]
  )
    throw new Error('dot publication requires one exact Agent and not-measured disclosure');
  // Markdown disclosure is first so a preceding fence, quote or raw-HTML
  // comment cannot hide it. Commit messages have no Markdown visibility model.
  const start = format === 'commit' ? text.indexOf(DOT_DISCLOSURE) : 0;
  const after = text.slice(start + DOT_DISCLOSURE.length);
  if (
    start < 0 ||
    !text.startsWith(DOT_DISCLOSURE, start) ||
    (after !== '' && !after.startsWith('\n')) ||
    /^## ModelTrace\s*$/m.test(text)
  )
    throw new Error(
      'dot disclosure must be exact and visible; no fingerprint receipt may be substituted'
    );
  return true;
}

export function assertDotDisclosure(text, format = 'markdown') {
  if (!hasDotDisclosure(text, format)) throw new Error('dot publication is missing its disclosure');
}
