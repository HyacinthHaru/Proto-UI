export const OWNED_STYLE =
  'block w-16 h-8 p-2 p-4 bg-[#ef4444] bg-[#2563eb] opacity-25 opacity-100';
export const CALLER_STYLE = 'p-1 bg-[#facc15]';
export const STYLE_TOKENS = [...new Set(`${OWNED_STYLE} ${CALLER_STYLE} p-8`.split(' '))];
