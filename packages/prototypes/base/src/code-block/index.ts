import root from './root.proto';
import header from './header.proto';
import content from './content.proto';

export type * from './types';

export type CodeBlockParts = {
  root: typeof root;
  header: typeof header;
  content: typeof content;
};

export { root, header, content };
export { asCodeBlockRoot } from './root.proto';
export { asCodeBlockHeader } from './header.proto';
export { asCodeBlockContent } from './content.proto';

export default { root, header, content };
